import { CheckCircle, ClipboardList, X, Check } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { EmptyState } from '@/components/polar/EmptyState';
import { Spinner } from '@/components/polar/LoadingStates';
import { useAgentActions } from '@/hooks/useAgentActions';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

function SparkleIndicator() {
  return <span className="text-primary text-xs" title="AI-voorstel">✦</span>;
}

export function TaskboxTab() {
  const { pendingActions, recentActions, isLoading, approve, reject } = useAgentActions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pending */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-foreground">Openstaand</h3>
          {pendingActions.length > 0 && (
            <NestoBadge variant="warning" size="sm">{pendingActions.length}</NestoBadge>
          )}
        </div>

        {pendingActions.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Geen openstaande taken"
            description="De assistent heeft geen acties die op goedkeuring wachten."
            size="sm"
          />
        ) : (
          <div className="space-y-2">
            {pendingActions.map((action) => (
              <NestoCard key={action.id} className="p-4">
                <div className="flex items-start gap-3">
                  <ClipboardList className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground">{action.title}</p>
                      <SparkleIndicator />
                    </div>
                    {action.beschrijving && (
                      <p className="text-xs text-muted-foreground">{action.beschrijving}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <NestoButton
                        size="sm"
                        onClick={() => approve.mutate(action.id)}
                        disabled={approve.isPending}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Goedkeuren
                      </NestoButton>
                      <NestoButton
                        size="sm"
                        variant="outline"
                        onClick={() => reject.mutate(action.id)}
                        disabled={reject.isPending}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Afwijzen
                      </NestoButton>
                    </div>
                  </div>
                </div>
              </NestoCard>
            ))}
          </div>
        )}
      </div>

      {/* Recent */}
      {recentActions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent afgehandeld</h3>
          <div className="space-y-1">
            {recentActions.slice(0, 10).map((action) => (
              <div key={action.id} className="flex items-center gap-3 py-2 px-3 rounded-lg">
                <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <p className="text-sm text-muted-foreground flex-1">{action.title}</p>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {action.created_at
                    ? format(new Date(action.created_at), 'HH:mm', { locale: nl })
                    : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
