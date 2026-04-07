import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { format, isToday, isYesterday, differenceInCalendarDays } from 'date-fns';
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
  channelIcon?: string;
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

function getChannelLabel(channel: string | undefined): string | undefined {
  if (!channel) return undefined;
  const labels: Record<string, string> = {
    widget: 'Web',
    whatsapp: 'WhatsApp',
    phone: 'Telefoon',
    operator: 'Handmatig',
    walk_in: 'Inloop',
    webchat: 'Web',
  };
  return labels[channel];
}

// getChannelEmoji removed — replaced by channelIcon field + Lucide icons in OverviewTab

function getCustomerName(metadata: any, changes: any): string {
  const name = metadata?.customer_name;
  if (name && name !== 'Gast') return name;
  // Try first_name + last_name from metadata
  const first = metadata?.first_name || changes?.first_name;
  const last = metadata?.last_name || changes?.last_name;
  if (first) return last ? `${first} ${last}` : first;
  return metadata?.phone || 'Onbekend';
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

function humanizeAudit(entry: RawAuditEntry, customerNameMap?: Map<string, string>): string {
  const name = customerNameMap?.get(entry.entity_id) || getCustomerName(entry.metadata, entry.changes);
  const changes = typeof entry.changes === 'object' ? entry.changes : {};
  const channel = changes?.channel?.new || changes?.channel || entry.metadata?.channel;
  const resDate = changes?.date?.new || changes?.date || entry.metadata?.reservation_date;
  const rawTime = changes?.start_time?.new || changes?.start_time || changes?.time?.new || changes?.time || entry.metadata?.start_time || '';
  const formattedTime = rawTime ? rawTime.toString().slice(0, 5) : '';
  const ps = changes?.party_size?.new || changes?.party_size || '';
  if (entry.action === 'created' && entry.entity_type === 'reservation') {
    const smartDate = resDate ? formatSmartDate(resDate) : '';
    return `${name} heeft gereserveerd${smartDate ? ` voor ${smartDate}` : ''}${formattedTime ? ` ${formattedTime}` : ''}${ps ? ` (${ps}p)` : ''}. ✓`;
  }

  if (entry.action === 'updated' && entry.entity_type === 'reservation') {
    if (changes.party_size?.old && changes.party_size?.new) {
      return `${name} wilde met ${changes.party_size.new} ipv ${changes.party_size.old} komen. Aangepast. ✓`;
    }
    if (changes.status) {
      if (changes.status.new === 'cancelled') return `${name} heeft geannuleerd${resDate ? ` voor ${formatSmartDate(resDate)}` : ''}${formattedTime ? ` ${formattedTime}` : ''}. ✓`;
      if (changes.status.new === 'confirmed') return `Reservering van ${name} bevestigd. ✓`;
      if (changes.status.new === 'checked_in' || changes.status.new === 'seated') return `${name} is ingecheckt. ✓`;
    }
    if (changes.time?.old && changes.time?.new || changes.start_time?.old && changes.start_time?.new) {
      const newTime = (changes.start_time?.new || changes.time?.new || '').toString().slice(0, 5);
      return `Reservering van ${name} verplaatst naar ${newTime}. ✓`;
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
    group.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let windowStart = new Date(group[0].timestamp).getTime();
    let windowItems = [group[0]];

    for (let i = 1; i < group.length; i++) {
      const t = new Date(group[i].timestamp).getTime();
      if (t - windowStart <= 5000) {
        windowItems.push(group[i]);
      } else {
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

interface EnrichedMessage {
  id: string;
  conversation_id: string;
  direction: string;
  content: string | null;
  is_ai_generated: boolean | null;
  template_name: string | null;
  created_at: string;
  sent_by: string | null;
  conversation: {
    channel: string;
    customer: { first_name: string; last_name: string } | null;
  } | null;
}

function groupMessagesByConversation(messages: EnrichedMessage[]): LogEntry[] {
  const entries: LogEntry[] = [];

  // Separate templates vs chat messages
  const templateMsgs = messages.filter(m => m.template_name);
  const chatMsgs = messages.filter(m => !m.template_name);

  // Group template messages (reminders/confirmations)
  if (templateMsgs.length > 0) {
    const grouped = templateMsgs.reduce((acc: Record<string, EnrichedMessage[]>, m) => {
      const key = m.template_name || 'other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(m);
      return acc;
    }, {});

    for (const [template, msgs] of Object.entries(grouped)) {
      const label = template.includes('reminder') ? 'reminders' :
                   template.includes('confirmation') ? 'bevestigingen' : 'berichten';
      entries.push({
        id: `bulk-${template}-${msgs[0].id}`,
        type: 'bulk_messages',
        description: `${msgs.length} ${label} verstuurd. ✓`,
        channelIcon: msgs[0]?.conversation?.channel || 'whatsapp',
        timestamp: msgs[0].created_at,
        formattedTime: formatLogTime(msgs[0].created_at),
        isAi: true,
        isToday: isToday(new Date(msgs[0].created_at)),
        channelLabel: undefined,
      });
    }
  }

  // Group chat messages by conversation_id within 10-minute windows
  const byConversation = new Map<string, EnrichedMessage[]>();
  for (const msg of chatMsgs) {
    const key = msg.conversation_id;
    if (!byConversation.has(key)) byConversation.set(key, []);
    byConversation.get(key)!.push(msg);
  }

  for (const [convId, msgs] of byConversation) {
    // Sort by time ascending
    msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Group into 10-minute windows
    const windows: EnrichedMessage[][] = [];
    let currentWindow: EnrichedMessage[] = [msgs[0]];
    let windowStart = new Date(msgs[0].created_at).getTime();

    for (let i = 1; i < msgs.length; i++) {
      const t = new Date(msgs[i].created_at).getTime();
      if (t - windowStart <= 600000) { // 10 minutes
        currentWindow.push(msgs[i]);
      } else {
        windows.push(currentWindow);
        currentWindow = [msgs[i]];
        windowStart = t;
      }
    }
    windows.push(currentWindow);

    for (const window of windows) {
      const first = window[0];
      const customer = first.conversation?.customer;
      const channel = first.conversation?.channel;
      const name = customer
        ? (customer.last_name ? `${customer.first_name} ${customer.last_name}` : customer.first_name)
        : 'Onbekend';
      const allAi = window.every(m => m.is_ai_generated);

      let description: string;
      if (window.length === 1) {
        description = `Bericht van ${name} beantwoord. ✓`;
      } else {
        description = `${name} had meerdere vragen. ${window.length} berichten beantwoord. ✓`;
      }

      entries.push({
        id: `msg-group-${convId}-${first.id}`,
        type: 'messages_grouped',
        description,
        timestamp: window[window.length - 1].created_at,
        formattedTime: formatLogTime(window[window.length - 1].created_at),
        isAi: allAi,
        isToday: isToday(new Date(first.created_at)),
        clickPath: `/assistent?tab=berichten&conversation=${convId}`,
        channelLabel: getChannelLabel(channel),
        channelIcon: channel,
      });
    }
  }

  return entries;
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
          .select('id, conversation_id, direction, content, is_ai_generated, template_name, created_at, sent_by, conversation:conversations(channel, customer:customers(first_name, last_name))')
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

      // Batch-fetch customer names for reservation audits
      const reservationIds = rawAudits
        .filter(a => a.entity_type === 'reservation')
        .map(a => a.entity_id);

      const customerNameMap = new Map<string, string>();
      if (reservationIds.length > 0) {
        const { data: resData } = await supabase
          .from('reservations')
          .select('id, customer_id, customers(first_name, last_name)')
          .in('id', reservationIds);
        for (const r of (resData || []) as any[]) {
          const c = r.customers;
          if (c?.first_name) {
            customerNameMap.set(r.id, c.last_name ? `${c.first_name} ${c.last_name}` : c.first_name);
          }
        }
      }

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
          description: humanizeAudit(audit, customerNameMap),
          timestamp: audit.created_at,
          formattedTime: formatLogTime(audit.created_at),
          isAi: audit.actor_type === 'ai' || audit.actor_type === 'system',
          isToday: isToday(new Date(audit.created_at)),
          entityType: audit.entity_type,
          entityId: audit.entity_id,
          channelLabel: getChannelLabel(channel),
          channelIcon: channel,
          clickPath: getAuditClickPath(audit),
        });
      }

      // Messages — enriched with customer names and grouped
      const enrichedMessages = (messagesRes.data || []).map((m: any) => ({
        id: m.id,
        conversation_id: m.conversation_id,
        direction: m.direction,
        content: m.content,
        is_ai_generated: m.is_ai_generated,
        template_name: m.template_name,
        created_at: m.created_at,
        sent_by: m.sent_by,
        conversation: m.conversation ? {
          channel: m.conversation.channel,
          customer: m.conversation.customer || null,
        } : null,
      })) as EnrichedMessage[];

      const messageEntries = groupMessagesByConversation(enrichedMessages);
      entries.push(...messageEntries);

      // Agent actions — batch-fetch conversation channels
      const actionConvIds = (actionsRes.data || [])
        .map((a: any) => a.action_data?.conversation_id)
        .filter(Boolean);

      const convChannelMap = new Map<string, string>();
      if (actionConvIds.length > 0) {
        const { data: convData } = await supabase
          .from('conversations')
          .select('id, channel')
          .in('id', actionConvIds);
        for (const c of (convData || []) as any[]) {
          convChannelMap.set(c.id, c.channel);
        }
      }

      for (const action of (actionsRes.data || []) as any[]) {
        if (action.status === 'concept') continue;
        const convId = action.action_data?.conversation_id;
        const channel = convChannelMap.get(convId);

        entries.push({
          id: `action-${action.id}`,
          type: `action_${action.status}`,
          description: action.title ? `${action.title}. Afgehandeld. ✓` : `Actie uitgevoerd. ✓`,
          timestamp: action.created_at,
          formattedTime: formatLogTime(action.created_at),
          isAi: true,
          isToday: isToday(new Date(action.created_at)),
          channelLabel: getChannelLabel(channel),
          channelIcon: channel,
          clickPath: convId ? `/assistent?tab=berichten&conversation=${convId}` : undefined,
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
