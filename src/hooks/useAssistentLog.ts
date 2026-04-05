import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { format, isToday, isYesterday } from 'date-fns';
import { nl } from 'date-fns/locale';

export interface LogEntry {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  formattedTime: string;
  isAi: boolean;
  clickPath?: string;
  entityType?: string;
  entityId?: string;
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

  if (entry.action === 'created' && entry.entity_type === 'reservation') {
    const ps = changes.party_size?.new || changes.party_size || '';
    const time = changes.time?.new || changes.time || '';
    return `Reservering geboekt voor ${name}${time ? ` om ${time}` : ''}${ps ? ` (${ps}p)` : ''}. ✓`;
  }

  if (entry.action === 'updated' && entry.entity_type === 'reservation') {
    const parts: string[] = [];
    if (changes.party_size) {
      parts.push(`${name} wilde met ${changes.party_size.new} ipv ${changes.party_size.old} komen. Plek gevonden, aangepast.`);
    }
    if (changes.status) {
      if (changes.status.new === 'cancelled') {
        return `${name} heeft geannuleerd. ✓`;
      }
      if (changes.status.new === 'confirmed') {
        return `Reservering van ${name} bevestigd. ✓`;
      }
      if (changes.status.new === 'checked_in') {
        return `${name} is ingecheckt. ✓`;
      }
    }
    if (changes.time) {
      parts.push(`Reservering van ${name} verplaatst naar ${changes.time.new}. ✓`);
    }
    if (parts.length > 0) return parts.join(' ');
    return `Reservering van ${name} bijgewerkt. ✓`;
  }

  if (entry.action === 'deleted' && entry.entity_type === 'reservation') {
    return `Reservering van ${name} verwijderd.`;
  }

  return `${entry.entity_type} ${entry.action}. ✓`;
}

export function useAssistentLog() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const { data: logEntries = [], isLoading } = useQuery({
    queryKey: ['assistent-log', locationId],
    queryFn: async () => {
      if (!locationId) return [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Fetch audit_log entries for today
      const [auditRes, messagesRes, actionsRes] = await Promise.all([
        supabase
          .from('audit_log')
          .select('*')
          .eq('location_id', locationId)
          .gte('created_at', todayISO)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('messages')
          .select('id, conversation_id, direction, content, is_ai_generated, template_name, created_at, sent_by')
          .eq('direction', 'outbound')
          .gte('created_at', todayISO)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('agent_actions')
          .select('*')
          .eq('location_id', locationId)
          .gte('created_at', todayISO)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const entries: LogEntry[] = [];

      // Process audit entries
      for (const audit of (auditRes.data || []) as RawAuditEntry[]) {
        entries.push({
          id: `audit-${audit.id}`,
          type: `${audit.entity_type}_${audit.action}`,
          description: humanizeAudit(audit),
          timestamp: audit.created_at,
          formattedTime: formatLogTime(audit.created_at),
          isAi: audit.actor_type === 'ai' || audit.actor_type === 'system',
          entityType: audit.entity_type,
          entityId: audit.entity_id,
          clickPath: audit.entity_type === 'reservation' ? `/reserveringen` : undefined,
        });
      }

      // Process outbound messages (group reminders)
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
          const label = template.includes('reminder') ? 'herinneringen' :
                       template.includes('confirmation') ? 'bevestigingen' : 'berichten';
          entries.push({
            id: `bulk-${template}-${(msgs as any[])[0].id}`,
            type: 'bulk_messages',
            description: `${(msgs as any[]).length} ${label} verstuurd. ✓`,
            timestamp: (msgs as any[])[0].created_at,
            formattedTime: formatLogTime((msgs as any[])[0].created_at),
            isAi: true,
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
          clickPath: `/assistent?tab=berichten`,
        });
      }

      // Process agent actions
      for (const action of (actionsRes.data || []) as any[]) {
        if (action.status === 'concept') continue; // skip pending
        entries.push({
          id: `action-${action.id}`,
          type: `action_${action.status}`,
          description: action.beschrijving || `${action.title}. ✓`,
          timestamp: action.created_at,
          formattedTime: formatLogTime(action.created_at),
          isAi: true,
        });
      }

      // Sort by timestamp descending
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return entries;
    },
    enabled: !!locationId,
    refetchInterval: 60000,
  });

  // Compute summary stats
  const stats = {
    messagesAnswered: logEntries.filter((e) => e.type === 'message_answered' || e.type === 'bulk_messages').length,
    reservationsBooked: logEntries.filter((e) => e.type === 'reservation_created').length,
    reservationsModified: logEntries.filter((e) => e.type === 'reservation_updated').length,
    remindersSent: logEntries.filter((e) => e.type === 'bulk_messages').reduce((sum, e) => {
      const match = e.description.match(/^(\d+)/);
      return sum + (match ? parseInt(match[1]) : 1);
    }, 0),
  };

  return { logEntries, stats, isLoading };
}
