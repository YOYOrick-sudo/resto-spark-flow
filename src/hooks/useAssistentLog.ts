import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { format, isToday, isYesterday, isTomorrow, differenceInCalendarDays } from 'date-fns';
import { nl } from 'date-fns/locale';

export interface LogEntry {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  formattedTime: string;
  isAi: boolean;
  isToday: boolean;
  clickPath?: string;
  entityType?: string;
  entityId?: string;
  channelLabel?: string;
}

function formatLogTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return `gisteren ${format(d, 'HH:mm')}`;
  return format(d, 'd MMM HH:mm', { locale: nl });
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + '…';
}

function formatSmartDate(dateStr: string): string {
  const target = new Date(dateStr + 'T12:00:00');
  const now = new Date();
  const diff = differenceInCalendarDays(target, now);

  if (diff === 0) {
    return now.getHours() >= 12 ? 'vanavond' : 'vanmiddag';
  }
  if (diff === 1) return 'morgen';
  if (diff === 2) return 'overmorgen';
  if (diff > 2 && diff <= 7) {
    return target.toLocaleDateString('nl-NL', { weekday: 'long' });
  }
  return target.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
}

function getChannelIcon(channel: string | undefined): string {
  if (!channel) return '📋';
  const icons: Record<string, string> = {
    widget: '🌐',
    whatsapp: '💬',
    phone: '📞',
    operator: '✏️',
    walk_in: '🚶',
    webchat: '🌐',
  };
  return icons[channel] || '📋';
}

// Actions to skip — technical/internal events
const SKIP_ACTIONS = new Set(['field_update', 'auto_assign', 'status_change', 'trigger']);

interface RawAuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_type: string;
  changes: any;
  created_at: string;
  metadata: any;
}

function humanizeAudit(entry: RawAuditEntry): string {
  const name = entry.metadata?.customer_name || 'Gast';
  const changes = typeof entry.changes === 'object' ? entry.changes : {};
  const channel = changes?.channel?.new || changes?.channel || entry.metadata?.channel;
  const resDate = changes?.date?.new || changes?.date || entry.metadata?.reservation_date;
  const time = changes?.time?.new || changes?.time || entry.metadata?.start_time || '';
  const ps = changes?.party_size?.new || changes?.party_size || '';

  if (entry.action === 'created' && entry.entity_type === 'reservation') {
    const smartDate = resDate ? formatSmartDate(resDate) : '';
    return `${name} heeft gereserveerd${smartDate ? ` voor ${smartDate}` : ''}${time ? ` ${time}` : ''}${ps ? ` (${ps}p)` : ''}. ✓`;
  }

  if (entry.action === 'updated' && entry.entity_type === 'reservation') {
    if (changes.party_size?.old && changes.party_size?.new) {
      return `${name} wilde met ${changes.party_size.new} ipv ${changes.party_size.old} komen. Aangepast. ✓`;
    }
    if (changes.status) {
      if (changes.status.new === 'cancelled') return `${name} heeft geannuleerd. ✓`;
      if (changes.status.new === 'confirmed') return `Reservering van ${name} bevestigd. ✓`;
      if (changes.status.new === 'checked_in' || changes.status.new === 'seated') return `${name} is ingecheckt. ✓`;
    }
    if (changes.time?.old && changes.time?.new) {
      return `Reservering van ${name} verplaatst naar ${changes.time.new}. ✓`;
    }
    return `Reservering van ${name} bijgewerkt. ✓`;
  }

  if (entry.action === 'deleted' && entry.entity_type === 'reservation') {
    return `Reservering van ${name} verwijderd.`;
  }

  return `${entry.entity_type} ${entry.action}. ✓`;
}

function getAuditClickPath(entry: RawAuditEntry): string | undefined {
  if (entry.entity_type === 'reservation') {
    const changes = typeof entry.changes === 'object' ? entry.changes : {};
    const resDate = changes?.date?.new || changes?.date || entry.metadata?.reservation_date;
    if (resDate) {
      return `/reserveringen?date=${resDate}&highlight=${entry.entity_id}`;
    }
    return `/reserveringen?highlight=${entry.entity_id}`;
  }
  return undefined;
}

function deduplicateEntries(entries: { entityId: string; timestamp: string; action: string; index: number }[]): Set<number> {
  const skipIndices = new Set<number>();
  const grouped = new Map<string, typeof entries>();

  for (const e of entries) {
    const key = e.entityId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }

  const actionPriority: Record<string, number> = { created: 3, updated: 2, deleted: 1 };

  for (const [, group] of grouped) {
    if (group.length <= 1) continue;
    // Sort by time, group within 5s windows
    group.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let windowStart = new Date(group[0].timestamp).getTime();
    let windowItems = [group[0]];

    for (let i = 1; i < group.length; i++) {
      const t = new Date(group[i].timestamp).getTime();
      if (t - windowStart <= 5000) {
        windowItems.push(group[i]);
      } else {
        // Close window, keep best
        if (windowItems.length > 1) {
          windowItems.sort((a, b) => (actionPriority[b.action] || 0) - (actionPriority[a.action] || 0));
          for (let j = 1; j < windowItems.length; j++) skipIndices.add(windowItems[j].index);
        }
        windowStart = t;
        windowItems = [group[i]];
      }
    }
    if (windowItems.length > 1) {
      windowItems.sort((a, b) => (actionPriority[b.action] || 0) - (actionPriority[a.action] || 0));
      for (let j = 1; j < windowItems.length; j++) skipIndices.add(windowItems[j].index);
    }
  }

  return skipIndices;
}

export function useAssistentLog() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['assistent-log', locationId],
    queryFn: async () => {
      if (!locationId) return { logEntries: [], hasActivityToday: false };

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const sinceISO = yesterday.toISOString();

      const [auditRes, messagesRes, actionsRes] = await Promise.all([
        supabase
          .from('audit_log')
          .select('*')
          .eq('location_id', locationId)
          .gte('created_at', sinceISO)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('messages')
          .select('id, conversation_id, direction, content, is_ai_generated, template_name, created_at, sent_by')
          .eq('direction', 'outbound')
          .gte('created_at', sinceISO)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('agent_actions')
          .select('*')
          .eq('location_id', locationId)
          .gte('created_at', sinceISO)
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

      const entries: LogEntry[] = [];

      // Filter & process audit entries
      const rawAudits = ((auditRes.data || []) as RawAuditEntry[])
        .filter(a => !SKIP_ACTIONS.has(a.action));

      // Deduplication
      const dedupInput = rawAudits.map((a, i) => ({
        entityId: a.entity_id,
        timestamp: a.created_at,
        action: a.action,
        index: i,
      }));
      const skipIndices = deduplicateEntries(dedupInput);

      for (let i = 0; i < rawAudits.length; i++) {
        if (skipIndices.has(i)) continue;
        const audit = rawAudits[i];
        const changes = typeof audit.changes === 'object' ? audit.changes : {};
        const channel = changes?.channel?.new || changes?.channel || audit.metadata?.channel;

        entries.push({
          id: `audit-${audit.id}`,
          type: `${audit.entity_type}_${audit.action}`,
          description: humanizeAudit(audit),
          timestamp: audit.created_at,
          formattedTime: formatLogTime(audit.created_at),
          isAi: audit.actor_type === 'ai' || audit.actor_type === 'system',
          isToday: isToday(new Date(audit.created_at)),
          entityType: audit.entity_type,
          entityId: audit.entity_id,
          channelIcon: getChannelIcon(channel),
          clickPath: getAuditClickPath(audit),
        });
      }

      // Messages
      const reminderMessages = (messagesRes.data || []).filter((m: any) => m.template_name);
      const chatMessages = (messagesRes.data || []).filter((m: any) => !m.template_name);

      if (reminderMessages.length > 0) {
        const grouped = reminderMessages.reduce((acc: Record<string, any[]>, m: any) => {
          const key = m.template_name || 'other';
          if (!acc[key]) acc[key] = [];
          acc[key].push(m);
          return acc;
        }, {});

        for (const [template, msgs] of Object.entries(grouped)) {
          const label = template.includes('reminder') ? 'reminders' :
                       template.includes('confirmation') ? 'bevestigingen' : 'berichten';
          entries.push({
            id: `bulk-${template}-${(msgs as any[])[0].id}`,
            type: 'bulk_messages',
            description: `📨 ${(msgs as any[]).length} ${label} verstuurd. ✓`,
            timestamp: (msgs as any[])[0].created_at,
            formattedTime: formatLogTime((msgs as any[])[0].created_at),
            isAi: true,
            isToday: isToday(new Date((msgs as any[])[0].created_at)),
            channelIcon: undefined, // bulk has icon in text
          });
        }
      }

      for (const msg of chatMessages) {
        entries.push({
          id: `msg-${msg.id}`,
          type: 'message_answered',
          description: msg.content
            ? `Bericht beantwoord: "${truncate(msg.content, 50)}". ✓`
            : 'Bericht beantwoord. ✓',
          timestamp: msg.created_at,
          formattedTime: formatLogTime(msg.created_at),
          isAi: !!msg.is_ai_generated,
          isToday: isToday(new Date(msg.created_at)),
          clickPath: msg.conversation_id ? `/assistent?tab=berichten&conversation=${msg.conversation_id}` : `/assistent?tab=berichten`,
          channelIcon: '💬',
        });
      }

      for (const action of (actionsRes.data || []) as any[]) {
        if (action.status === 'concept') continue;
        entries.push({
          id: `action-${action.id}`,
          type: `action_${action.status}`,
          description: action.beschrijving || `${action.title}. ✓`,
          timestamp: action.created_at,
          formattedTime: formatLogTime(action.created_at),
          isAi: true,
          isToday: isToday(new Date(action.created_at)),
        });
      }

      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const hasActivityToday = entries.some((e) => e.isToday);

      return { logEntries: entries, hasActivityToday };
    },
    enabled: !!locationId,
    refetchInterval: 60000,
  });

  return {
    logEntries: data?.logEntries ?? [],
    hasActivityToday: data?.hasActivityToday ?? false,
    isLoading,
  };
}
