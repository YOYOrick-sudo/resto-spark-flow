import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, MessageSquare, Calendar, Send, CheckCircle, Check, X, ClipboardList } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { NestoButton } from '@/components/polar/NestoButton';
import { EmptyState } from '@/components/polar/EmptyState';
import { Spinner } from '@/components/polar/LoadingStates';
import { useSignals } from '@/hooks/useSignals';
import { useConversations } from '@/hooks/useConversations';
import { useAgentActions } from '@/hooks/useAgentActions';
import { useAssistentLog } from '@/hooks/useAssistentLog';
import { useUserContext } from '@/contexts/UserContext';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Goedemorgen';
  if (h < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

function SparkleIndicator() {
  return (
    <span className="text-primary text-xs ml-1" title="Automatisch door AI">✦</span>
  );
}

export function OverviewTab() {
  const navigate = useNavigate();
  const { context } = useUserContext();
  const { signals } = useSignals();
  const { conversations } = useConversations('active');
  const { pendingActions } = useAgentActions();
  const { logEntries, stats, isLoading } = useAssistentLog();

  // Get first name from profiles table
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

  const urgentSignals = useMemo(
    () => signals.filter((s) => s.actionable && (s.severity === 'error' || s.severity === 'warning')),
    [signals]
  );

  const escalatedConversations = useMemo(
    () => conversations.filter((c) => c.handled_by === 'operator' && (c.unread_count || 0) > 0),
    [conversations]
  );

  const totalUrgent = urgentSignals.length + escalatedConversations.length + pendingActions.length;

  const summaryText = totalUrgent === 0
    ? 'Alles is afgehandeld. Lekker zo! ✓'
    : `${totalUrgent} ${totalUrgent === 1 ? 'dingetje' : 'dingetjes'} voor je:`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {getGreeting()} {firstName} 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{summaryText}</p>
      </div>

      {/* Urgent items */}
      {totalUrgent > 0 && (
        <div className="space-y-2">
          {urgentSignals.map((signal) => (
            <NestoCard
              key={signal.id}
              className="p-4 cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => signal.action_path && navigate(signal.action_path)}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{signal.title}</p>
                  {signal.message && (
                    <p className="text-xs text-muted-foreground mt-0.5">{signal.message}</p>
                  )}
                </div>
                <span className="text-xs text-primary font-medium">Bekijk →</span>
              </div>
            </NestoCard>
          ))}

          {escalatedConversations.map((conv) => (
            <NestoCard
              key={conv.id}
              className="p-4 cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => navigate('/assistent?tab=berichten')}
            >
              <div className="flex items-start gap-3">
                <MessageSquare className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {conv.customer
                      ? `${conv.customer.first_name} ${conv.customer.last_name} wil even met iemand spreken`
                      : 'Geëscaleerd gesprek'}
                  </p>
                </div>
                <span className="text-xs text-primary font-medium">Open gesprek →</span>
              </div>
            </NestoCard>
          ))}

          {pendingActions.map((action) => (
            <NestoCard
              key={action.id}
              className="p-4 cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => navigate('/assistent?tab=takenbox')}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{action.title}</p>
                  {action.beschrijving && (
                    <p className="text-xs text-muted-foreground mt-0.5">{action.beschrijving}</p>
                  )}
                </div>
                <span className="text-xs text-primary font-medium">Bekijk →</span>
              </div>
            </NestoCard>
          ))}
        </div>
      )}

      {/* Compact stats */}
      {(stats.messagesAnswered > 0 || stats.reservationsBooked > 0 || stats.reservationsModified > 0 || stats.remindersSent > 0) && (
        <div className="flex flex-wrap gap-4">
          {stats.messagesAnswered > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>{stats.messagesAnswered} berichten beantwoord</span>
            </div>
          )}
          {stats.reservationsBooked > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{stats.reservationsBooked} reserveringen geboekt</span>
            </div>
          )}
          {stats.reservationsModified > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{stats.reservationsModified} reserveringen gewijzigd</span>
            </div>
          )}
          {stats.remindersSent > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Send className="h-4 w-4" />
              <span>{stats.remindersSent} reminders verstuurd</span>
            </div>
          )}
        </div>
      )}

      {/* Activity log */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Vandaag geregeld</h3>
        {logEntries.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Nog geen activiteit vandaag"
            description="De assistent registreert hier wat er vandaag is gedaan."
            size="sm"
          />
        ) : (
          <div className="space-y-1">
            {logEntries.slice(0, 20).map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-accent/20 transition-colors cursor-pointer group"
                onClick={() => entry.clickPath && navigate(entry.clickPath)}
              >
                <span className="text-xs text-muted-foreground w-12 flex-shrink-0 pt-0.5 tabular-nums">
                  {entry.formattedTime}
                </span>
                <p className="text-sm text-foreground flex-1">
                  {entry.description}
                  {entry.isAi && <SparkleIndicator />}
                </p>
              </div>
            ))}
            {logEntries.length > 20 && (
              <p className="text-xs text-muted-foreground pl-[60px] py-2">
                + {logEntries.length - 20} meer...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
