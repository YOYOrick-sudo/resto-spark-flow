import { useState } from 'react';
import { Sparkles, ArrowRightLeft, Trash2 } from 'lucide-react';
import { NestoPanel } from '@/components/polar/NestoPanel';
import { NestoButton } from '@/components/polar/NestoButton';
import { InfoAlert } from '@/components/polar/InfoAlert';
import { useReservation } from '@/hooks/useReservation';
import { useAssignTable } from '@/hooks/useAssignTable';
import { useMoveTable } from '@/hooks/useMoveTable';
import { useAreasWithTables } from '@/hooks/useAreasWithTables';
import { useReservations } from '@/hooks/useReservations';
import { useUserContext } from '@/contexts/UserContext';
import { STATUS_CONFIG } from '@/types/reservation';
import { formatDateTimeCompact } from '@/lib/datetime';
import { getDisplayName, formatTime } from '@/lib/reservationUtils';
import { nestoToast } from '@/lib/nestoToast';
import { Spinner } from '@/components/polar/LoadingStates';
import { ReservationBadges } from './ReservationBadges';
import { ReservationActions } from './ReservationActions';
import { CustomerCard } from './CustomerCard';
import { RiskScoreSection } from './RiskScoreSection';
import { AuditLogTimeline } from './AuditLogTimeline';
import { OptionBadge } from './OptionBadge';
import { TableMoveDialog } from './TableMoveDialog';
import { TableSelector } from './TableSelector';
import { cn } from '@/lib/utils';

interface ReservationDetailPanelProps {
  reservationId: string | null;
  open: boolean;
  onClose: () => void;
}

export function ReservationDetailPanel({ reservationId, open, onClose }: ReservationDetailPanelProps) {
  const { data: reservation, isLoading, error } = useReservation(reservationId);
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const assignTable = useAssignTable();
  const moveTable = useMoveTable();
  const { data: areasWithTables = [] } = useAreasWithTables(locationId);
  const { data: reservationsForDate = [] } = useReservations(
    reservation ? { date: reservation.reservation_date } : { date: '' },
  );
  const [tableMoveOpen, setTableMoveOpen] = useState(false);
  const [showManualSelect, setShowManualSelect] = useState(false);

  const isTerminal = reservation?.status === 'cancelled' || reservation?.status === 'no_show' || reservation?.status === 'completed';

  const handleAutoAssign = () => {
    if (!reservation) return;
    assignTable.mutate({
      location_id: reservation.location_id,
      date: reservation.reservation_date,
      time: reservation.start_time.slice(0, 5),
      party_size: reservation.party_size,
      duration_minutes: reservation.duration_minutes,
      shift_id: reservation.shift_id,
      ticket_id: reservation.ticket_id,
      reservation_id: reservation.id,
    }, {
      onSuccess: (data) => {
        if (data.assigned) {
          nestoToast.success(`${data.table_name} toegewezen (${data.area_name})`);
        } else {
          nestoToast.warning('Geen tafel beschikbaar');
        }
      },
    });
  };

  const handleUnassign = () => {
    if (!reservation) return;
    moveTable.mutate({ reservationId: reservation.id, newTableId: null as any });
  };

  const handleManualAssign = (newTableId: string) => {
    if (!reservation) return;
    moveTable.mutate({ reservationId: reservation.id, newTableId });
    setShowManualSelect(false);
  };

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
                <p className="text-xs text-muted-foreground mb-1">Reservering</p>
                <h2 ref={titleRef} className="text-lg font-semibold text-foreground">
                  {getDisplayName(reservation)}
                </h2>

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

                {reservation.status === 'seated' && reservation.checked_in_at && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Ingecheckt om {formatDateTimeCompact(reservation.checked_in_at)}
                  </p>
                )}

                {reservation.status === 'option' && (
                  <div className="mt-2">
                    <OptionBadge optionExpiresAt={reservation.option_expires_at} />
                  </div>
                )}

                <ReservationBadges reservation={reservation} className="mt-3" />

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

                <ReservationActions reservation={reservation} className="mt-4" />
              </div>

              {/* Section 2: Table Assignment */}
              {!isTerminal && (
                <div className="p-5">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Tafel</p>
                  {reservation.table_id ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-foreground">{reservation.table_label || '—'}</span>
                        {reservation.table_group_id && (
                          <span className="text-xs text-muted-foreground">(Groep)</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <NestoButton
                          variant="outline"
                          size="sm"
                          onClick={() => setTableMoveOpen(true)}
                          leftIcon={<ArrowRightLeft className="h-3.5 w-3.5" />}
                        >
                          Wijzig tafel
                        </NestoButton>
                        <NestoButton
                          variant="outline"
                          size="sm"
                          onClick={handleUnassign}
                          disabled={moveTable.isPending}
                          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                        >
                          Verwijder toewijzing
                        </NestoButton>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <InfoAlert variant="warning" title="Geen tafel toegewezen" />
                      <div className="flex gap-2">
                        <NestoButton
                          variant="primary"
                          size="sm"
                          onClick={handleAutoAssign}
                          disabled={assignTable.isPending}
                          isLoading={assignTable.isPending}
                          leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                        >
                          Automatisch toewijzen
                        </NestoButton>
                        <NestoButton
                          variant="outline"
                          size="sm"
                          onClick={() => setShowManualSelect(!showManualSelect)}
                        >
                          Handmatig kiezen
                        </NestoButton>
                      </div>
                      {showManualSelect && (
                        <TableSelector
                          value={null}
                          onChange={handleManualAssign}
                          areas={areasWithTables}
                          partySize={reservation.party_size}
                          date={reservation.reservation_date}
                          startTime={reservation.start_time}
                          effectiveDuration={reservation.duration_minutes}
                          reservationsForDate={reservationsForDate}
                          showAutoOption={false}
                          showNoneOption={false}
                          placeholder="Selecteer tafel..."
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Section 3: Customer Card */}
              <CustomerCard
                customer={reservation.customer}
                reservationId={reservation.id}
              />

              {/* Section 4: Risk Score */}
              <RiskScoreSection reservation={reservation} />

              {/* Section 5: Audit Log */}
              <AuditLogTimeline reservationId={reservation.id} />
            </div>
          )}

          {/* Table move dialog */}
          {reservation && (
            <TableMoveDialog
              open={tableMoveOpen}
              onOpenChange={setTableMoveOpen}
              reservationId={reservation.id}
              currentTableId={reservation.table_id}
              locationId={reservation.location_id}
              partySize={reservation.party_size}
              reservationDate={reservation.reservation_date}
              startTime={reservation.start_time}
              durationMinutes={reservation.duration_minutes}
            />
          )}
        </>
      )}
    </NestoPanel>
  );
}
