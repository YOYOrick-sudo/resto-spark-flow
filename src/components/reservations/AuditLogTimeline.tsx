import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuditLog } from '@/hooks/useAuditLog';
import { STATUS_LABELS } from '@/types/reservation';
import { formatDateTimeCompact } from '@/lib/datetime';
import type { AuditLogEntry } from '@/types/reservation';

interface AuditLogTimelineProps {
  reservationId: string;
  className?: string;
}

function formatAction(entry: AuditLogEntry): string {
  const changes = entry.changes as Record<string, unknown>;
  const metadata = entry.metadata as Record<string, unknown>;

  switch (entry.action) {
    case 'created': {
      const channel = changes?.channel as string || '';
      return `Aangemaakt via ${channel}`;
    }
    case 'status_change': {
      const newStatus = changes?.new_status as string || '';
      const label = STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS] || newStatus;
      const reason = metadata?.reason as string;
      return reason ? `Status → ${label} — ${reason}` : `Status → ${label}`;
    }
    case 'field_update': {
      const entries = Object.entries(changes || {});
      if (entries.length === 0) return 'Gewijzigd';
      return entries.map(([k, v]) => `${k}: ${String(v)}`).join(', ');
    }
    default:
      return entry.action;
  }
}

export function AuditLogTimeline({ reservationId, className }: AuditLogTimelineProps) {
  const { data: entries = [], isLoading } = useAuditLog('reservation', reservationId);

  if (isLoading) {
    return (
      <div className={cn('p-4', className)}>
        <h3 className="text-sm font-semibold text-foreground mb-3">Activiteit</h3>
        <p className="text-xs text-muted-foreground italic">Laden...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={cn('p-4', className)}>
        <h3 className="text-sm font-semibold text-foreground mb-3">Activiteit</h3>
        <p className="text-xs text-muted-foreground">Geen activiteit gevonden</p>
      </div>
    );
  }

  return (
    <div className={cn('p-4', className)}>
      <h3 className="text-sm font-semibold text-foreground mb-3">Activiteit</h3>
      <div className="space-y-3">
        {entries.map((entry) => {
          const metadata = entry.metadata as Record<string, unknown>;
          const isOverride = metadata?.is_override === true;

          return (
            <div
              key={entry.id}
              className={cn(
                'flex gap-3 text-xs',
                isOverride && 'bg-warning/5 -mx-2 px-2 py-1.5 rounded-lg border border-warning/20'
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {isOverride ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-foreground', isOverride && 'font-medium')}>
                  {formatAction(entry)}
                  {isOverride && (
                    <span className="ml-1.5 text-warning font-medium">(override)</span>
                  )}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {entry.actor_id ? 'Medewerker' : 'Systeem'} • {formatDateTimeCompact(entry.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
