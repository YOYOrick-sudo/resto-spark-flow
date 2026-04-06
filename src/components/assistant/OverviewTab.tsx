import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Plus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { Spinner } from '@/components/polar/LoadingStates';
import { SparkleIndicator } from '@/components/polar/SparkleIndicator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSignals } from '@/hooks/useSignals';
import { useConversations } from '@/hooks/useConversations';
import { useAgentActions } from '@/hooks/useAgentActions';
import { useAssistentLog } from '@/hooks/useAssistentLog';
import { useUserContext } from '@/contexts/UserContext';
import { nestoToast } from '@/lib/nestoToast';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

const LOG_PAGE_SIZE = 7;

const TASK_LABELS: Record<string, string> = {
  whatsapp_answer_faq: 'FAQ beantwoorden',
  whatsapp_create_reservation: 'Reserveringen boeken',
  whatsapp_modify_reservation: 'Reserveringen wijzigen',
  whatsapp_cancel_reservation: 'Reserveringen annuleren',
  send_reminder: 'Reminders versturen',
  send_confirmation: 'Bevestigingen versturen',
};

export function OverviewTab() {
  const navigate = useNavigate();
  const { context, currentLocation } = useUserContext();
  const queryClient = useQueryClient();
  const { signals } = useSignals();
  const { conversations } = useConversations('active');
  const { pendingActions, approve, reject } = useAgentActions();
  const { logEntries, hasActivityToday, isLoading } = useAssistentLog();
  const [visibleCount, setVisibleCount] = useState(LOG_PAGE_SIZE);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const locationId = currentLocation?.id;

  const { data: profile } = useQuery({
    queryKey: ['profile-name', context?.user_id],
    queryFn: async () => {
      if (!context) return null;
      const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', context.user_id)
        .single();
      return data;
    },
    enabled: !!context,
  });
  const firstName = profile?.name?.split(' ')[0] || 'daar';

  // New capability cards: agent_configurations with is_enabled = false
  const { data: newCapabilities = [] } = useQuery({
    queryKey: ['new-capabilities', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data } = await supabase
        .from('agent_configurations')
        .select('*')
        .eq('location_id', locationId)
        .eq('is_enabled', false);
      return data || [];
    },
    enabled: !!locationId,
  });

  const enableCapability = useMutation({
    mutationFn: async ({ taskKey, level }: { taskKey: string; level: string }) => {
      if (!locationId) throw new Error('No location');
      await supabase
        .from('agent_configurations')
        .update({ is_enabled: true, autonomy_level: level, updated_at: new Date().toISOString() })
        .eq('location_id', locationId)
        .eq('task_key', taskKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['new-capabilities', locationId] });
      queryClient.invalidateQueries({ queryKey: ['agent-configurations', locationId] });
      nestoToast.success('Ingesteld!');
    },
  });

  const urgentSignals = useMemo(
    () => signals.filter((s) => s.actionable && (s.severity === 'error' || s.severity === 'warning')),
    [signals]
  );

  const escalatedConversations = useMemo(
    () => conversations.filter((c) => c.handled_by === 'operator' && (c.unread_count || 0) > 0),
    [conversations]
  );

  // Separate action types
  const regularActions = pendingActions.filter(a =>
    !['knowledge_gap', 'autonomy_suggestion'].includes(a.action_type)
  );
  const knowledgeGaps = pendingActions.filter(a => a.action_type === 'knowledge_gap');
  const autonomySuggestions = pendingActions.filter(a => a.action_type === 'autonomy_suggestion');

  const totalUrgent = urgentSignals.length + escalatedConversations.length + regularActions.length;

  const summaryText = totalUrgent === 0
    ? (hasActivityToday ? 'Alles loopt. Lekker zo!' : 'De dag begint net. Ik hou het in de gaten.')
    : totalUrgent >= 4
    ? `${totalUrgent} zaken die aandacht nodig hebben:`
    : escalatedConversations.length > 0 && totalUrgent === 1
    ? 'Een gast wil je spreken:'
    : `${totalUrgent} ${totalUrgent === 1 ? 'dingetje' : 'dingetjes'} voor je:`;

  const handleApprove = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    approve.mutate(id);
  };

  const handleReject = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
    reject.mutate(id);
  };

  // Split log into today and yesterday groups
  const todayEntries = logEntries.filter((e) => e.isToday);
  const yesterdayEntries = logEntries.filter((e) => !e.isToday);
  const allLogItems = [...todayEntries, ...yesterdayEntries];
  const visibleItems = allLogItems.slice(0, visibleCount);
  const hasMore = allLogItems.length > visibleCount;
  const yesterdayStartIdx = visibleItems.findIndex((e) => !e.isToday);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {getGreeting()} {firstName} 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{summaryText}</p>
      </div>

      {/* Action cards */}
      {(totalUrgent > 0 || knowledgeGaps.length > 0 || autonomySuggestions.length > 0 || newCapabilities.length > 0) && (
        <div className="space-y-3">
          {/* Escalated conversations */}
          {escalatedConversations.map((conv) => (
            <div
              key={conv.id}
              className="bg-warning/5 border border-warning/20 rounded-xl p-4 transition-opacity duration-300"
            >
              <p className="text-sm text-foreground">
                💬{' '}
                {conv.customer
                  ? `${conv.customer.first_name} ${conv.customer.last_name} wil even met iemand spreken.`
                  : 'Een gast wil iemand spreken.'}
              </p>
              <div className="mt-3">
                <NestoButton size="sm" onClick={() => navigate('/assistent?tab=berichten')}>
                  Open gesprek
                </NestoButton>
              </div>
            </div>
          ))}

          {/* Regular pending actions (booking approvals etc) */}
          {regularActions
            .filter((a) => !dismissedIds.has(a.id))
            .map((action) => (
              <div
                key={action.id}
                className="bg-muted border border-border rounded-xl p-4 transition-opacity duration-300"
                style={{ opacity: dismissedIds.has(action.id) ? 0 : 1 }}
              >
                <p className="text-sm text-foreground">
                  📋 {action.beschrijving || action.title}
                  <SparkleIndicator size="sm" variant="muted" className="ml-1" />
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <NestoButton size="sm" onClick={() => handleApprove(action.id)} disabled={approve.isPending}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Goedkeuren
                  </NestoButton>
                  <NestoButton size="sm" variant="outline" onClick={() => handleReject(action.id)} disabled={reject.isPending}>
                    <X className="h-3.5 w-3.5 mr-1" /> Afwijzen
                  </NestoButton>
                </div>
              </div>
            ))}

          {/* Knowledge gap cards */}
          {knowledgeGaps
            .filter((a) => !dismissedIds.has(a.id))
            .map((action) => (
              <div
                key={action.id}
                className="bg-primary/5 border border-primary/20 rounded-xl p-4 transition-opacity duration-300"
                style={{ opacity: dismissedIds.has(action.id) ? 0 : 1 }}
              >
                <p className="text-sm text-foreground">
                  📚 {action.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{action.beschrijving}</p>
                <div className="flex items-center gap-2 mt-3">
                  <NestoButton
                    size="sm"
                    onClick={() => {
                      setDismissedIds((prev) => new Set(prev).add(action.id));
                      approve.mutate(action.id);
                      navigate('/instellingen/assistent');
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Toevoegen
                  </NestoButton>
                  <NestoButton size="sm" variant="outline" onClick={() => handleReject(action.id)}>
                    Later
                  </NestoButton>
                </div>
              </div>
            ))}

          {/* Autonomy suggestion cards */}
          {autonomySuggestions
            .filter((a) => !dismissedIds.has(a.id))
            .map((action) => {
              const taskKey = (action.action_data as any)?.task_key;
              const taskLabel = TASK_LABELS[taskKey] || taskKey;
              return (
                <div
                  key={action.id}
                  className="bg-muted border border-border rounded-xl p-4 transition-opacity duration-300"
                  style={{ opacity: dismissedIds.has(action.id) ? 0 : 1 }}
                >
                  <p className="text-sm text-foreground">
                    <Sparkles className="h-3.5 w-3.5 inline mr-1 text-primary" />
                    {action.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Zal ik "{taskLabel}" voortaan zelf afhandelen?
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <NestoButton size="sm" onClick={() => handleApprove(action.id)}>
                      Ja, doe maar
                    </NestoButton>
                    <NestoButton size="sm" variant="outline" onClick={() => handleReject(action.id)}>
                      Nee, liever niet
                    </NestoButton>
                  </div>
                </div>
              );
            })}

          {/* New capability introduction cards */}
          {newCapabilities.map((cap: any) => {
            const taskLabel = TASK_LABELS[cap.task_key] || cap.task_key;
            return (
              <div
                key={cap.id}
                className="bg-primary/5 border border-primary/20 rounded-xl p-4"
              >
                <p className="text-sm text-foreground">
                  <Sparkles className="h-3.5 w-3.5 inline mr-1 text-primary" />
                  Nieuw: je Assistent kan nu <strong>{taskLabel}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Hoe wil je dit instellen?</p>
                <div className="flex items-center gap-2 mt-3">
                  <NestoButton size="sm" onClick={() => enableCapability.mutate({ taskKey: cap.task_key, level: 'autonomous' })}>
                    Zelfstandig
                  </NestoButton>
                  <NestoButton size="sm" variant="outline" onClick={() => enableCapability.mutate({ taskKey: cap.task_key, level: 'recommend' })}>
                    Vraag eerst
                  </NestoButton>
                </div>
              </div>
            );
          })}

          {/* Urgent signals */}
          {urgentSignals.map((signal) => (
            <div
              key={signal.id}
              className="bg-warning/5 border border-warning/20 rounded-xl p-4 cursor-pointer transition-colors hover:bg-warning/10"
              onClick={() => signal.action_path && navigate(signal.action_path)}
            >
              <p className="text-sm text-foreground">
                ⚠️ {signal.title}
                {signal.message && <span className="text-muted-foreground"> — {signal.message}</span>}
              </p>
              {signal.action_path && (
                <div className="mt-3">
                  <NestoButton size="sm" variant="outline">Bekijk →</NestoButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Activity log */}
      {allLogItems.length > 0 ? (
        <div className="space-y-0">
          {visibleItems.map((entry, idx) => (
            <div key={entry.id}>
              {idx === yesterdayStartIdx && yesterdayStartIdx > 0 && (
                <div className="flex items-center gap-3 py-3">
                  <span className="text-xs text-muted-foreground font-medium">Gisteren</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              <div
                className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => entry.clickPath && navigate(entry.clickPath)}
              >
                <span className="text-xs text-muted-foreground w-12 flex-shrink-0 pt-0.5 tabular-nums">
                  {entry.formattedTime}
                </span>
                <p className="text-sm text-foreground flex-1">
                  {entry.channelLabel && (
                    <NestoBadge variant="outline" size="sm" className="text-muted-foreground flex-shrink-0 mr-1.5">
                      {entry.channelLabel}
                    </NestoBadge>
                  )}
                  {entry.description}
                  {entry.isAi && <SparkleIndicator size="sm" variant="muted" className="ml-1" />}
                </p>
              </div>
            </div>
          ))}
          {hasMore && (
            <button
              className="text-xs text-primary hover:underline px-3 py-2"
              onClick={() => setVisibleCount((v) => v + LOG_PAGE_SIZE)}
            >
              Toon meer…
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
