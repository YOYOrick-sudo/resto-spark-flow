import { NestoPanel } from '@/components/polar/NestoPanel';
import { useReservation } from '@/hooks/useReservation';
import { STATUS_CONFIG } from '@/types/reservation';
import { formatDateTimeCompact } from '@/lib/datetime';
import { getDisplayName, formatTime } from '@/lib/reservationUtils';
import { Spinner } from '@/components/polar/LoadingStates';
import { ReservationBadges } from './ReservationBadges';
import { ReservationActions } from './ReservationActions';
import { CustomerCard } from './CustomerCard';
import { RiskScoreSection } from './RiskScoreSection';
import { AuditLogTimeline } from './AuditLogTimeline';
import { OptionBadge } from './OptionBadge';
import { cn } from '@/lib/utils';

interface ReservationDetailPanelProps {
  reservationId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ReservationDetailPanel({ reservationId, open, onClose }: ReservationDetailPanelProps) {
  const { data: reservation, isLoading, error } = useReservation(reservationId);

  return (
    <NestoPanel open={open} onClose={onClose} title="Reservering">
      {(titleRef) => (
        <>
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          )}

          {error && (
            <div className="p-5 text-sm text-destructive">
              Fout bij laden: {error.message}
            </div>
          )}

          {reservation && (
            <div className="divide-y divide-border/50">
              {/* Section 1: Header + Summary */}
              <div className="p-5">
                {/* Context label */}
                <p className="text-xs text-muted-foreground mb-1">Reservering</p>

                {/* Guest name — observed by IntersectionObserver */}
                <h2 ref={titleRef} className="text-lg font-semibold text-foreground">
                  {getDisplayName(reservation)}
                </h2>

                {/* Summary line */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 flex-wrap">
                  <span className="font-medium text-foreground">{reservation.party_size}p</span>
                  <span>•</span>
                  <span>{reservation.shift_name || '—'}</span>
                  {reservation.table_label && (
                    <>
                      <span>•</span>
                      <span>{reservation.table_label}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{formatTime(reservation.start_time)}–{formatTime(reservation.end_time)}</span>
                </div>

                {/* Status badge */}
                {STATUS_CONFIG[reservation.status] && (
                  <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-medium mt-3',
                    STATUS_CONFIG[reservation.status].textClass,
                    STATUS_CONFIG[reservation.status].bgClass,
                    STATUS_CONFIG[reservation.status].borderClass,
                  )}>
                    {STATUS_CONFIG[reservation.status].showDot && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: STATUS_CONFIG[reservation.status].dotColor }}
                      />
                    )}
                    {STATUS_CONFIG[reservation.status].label}
                  </span>
                )}

                {/* Checked-in-at indicator */}
                {reservation.status === 'seated' && reservation.checked_in_at && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Ingecheckt om {formatDateTimeCompact(reservation.checked_in_at)}
                  </p>
                )}

                {/* Option countdown */}
                {reservation.status === 'option' && (
                  <div className="mt-2">
                    <OptionBadge optionExpiresAt={reservation.option_expires_at} />
                  </div>
                )}

                {/* Badges */}
                <ReservationBadges reservation={reservation} className="mt-3" />

                {/* Notes */}
                {reservation.guest_notes && (
                  <div className="mt-3 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Gast notitie</p>
                    <p className="text-sm text-foreground">{reservation.guest_notes}</p>
                  </div>
                )}
                {reservation.internal_notes && (
                  <div className="mt-2 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Interne notitie</p>
                    <p className="text-sm text-foreground">{reservation.internal_notes}</p>
                  </div>
                )}

                {/* Actions */}
                <ReservationActions reservation={reservation} className="mt-4" />
              </div>

              {/* Section 2: Customer Card */}
              <CustomerCard
                customer={reservation.customer}
                reservationId={reservation.id}
              />

              {/* Section 3: Risk Score */}
              <RiskScoreSection reservation={reservation} />

              {/* Section 4: Audit Log */}
              <AuditLogTimeline reservationId={reservation.id} />
            </div>
          )}
        </>
      )}
    </NestoPanel>
  );
}
