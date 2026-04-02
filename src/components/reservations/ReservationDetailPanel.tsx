import { useState } from 'react';
import { Sparkles, ArrowRightLeft, Trash2, CreditCard } from 'lucide-react';
import { SparkleIndicator } from '@/components/polar/SparkleIndicator';
import { isAiChannel } from '@/utils/isAiGenerated';
import { NestoPanel } from '@/components/polar/NestoPanel';
import { NestoButton } from '@/components/polar/NestoButton';
import { InfoAlert } from '@/components/polar/InfoAlert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { useMollieRefund } from '@/hooks/useMollieRefund';
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
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const mollieRefund = useMollieRefund();

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
            <div className="flex flex-col">
              {/* Fixed Header: Summary + Actions */}
              <div className="p-5 border-b border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Reservering</p>
                <h2 ref={titleRef} className="text-lg font-semibold text-foreground flex items-center gap-1.5">
                  {getDisplayName(reservation)}
                  {isAiChannel(reservation.channel) && (
                    <SparkleIndicator size="md" label="Automatisch geboekt via AI-kanaal" />
                  )}
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

                <ReservationActions reservation={reservation} className="mt-4" />
              </div>

              {/* Tabs */}
              <Tabs defaultValue="details" className="flex-1">
                <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent h-auto p-0">
                  <TabsTrigger
                    value="details"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-xs font-medium"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="guest"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-xs font-medium"
                  >
                    Gast
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-xs font-medium"
                  >
                    Activiteit
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Details */}
                <TabsContent value="details" className="mt-0">
                  <div className="divide-y divide-border/50">
                    {/* Table Assignment */}
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
                                Verwijder
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
                                Automatisch
                              </NestoButton>
                              <NestoButton
                                variant="outline"
                                size="sm"
                                onClick={() => setShowManualSelect(!showManualSelect)}
                              >
                                Handmatig
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

                    {/* Notes */}
                    {(reservation.guest_notes || reservation.internal_notes) && (
                      <div className="p-5 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Notities</p>
                        {reservation.guest_notes && (
                          <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-0.5">Gast</p>
                            <p className="text-sm text-foreground">{reservation.guest_notes}</p>
                          </div>
                        )}
                        {reservation.internal_notes && (
                          <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-0.5">Intern</p>
                            <p className="text-sm text-foreground">{reservation.internal_notes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Badges */}
                    <div className="p-5">
                      <ReservationBadges reservation={reservation} />
                    </div>

                    {/* Payment */}
                    {reservation.payment_status && reservation.payment_status !== 'none' && (
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Betaling</span>
                          </div>
                          <span className="text-sm text-muted-foreground tabular-nums">
                            €{((reservation.payment_amount ?? 0) / 100).toFixed(2)}
                          </span>
                        </div>
                        {reservation.payment_status === 'paid' && (
                          <NestoButton
                            variant="outline"
                            size="sm"
                            onClick={() => setRefundDialogOpen(true)}
                            className="w-full"
                          >
                            Terugbetalen
                          </NestoButton>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab: Guest */}
                <TabsContent value="guest" className="mt-0">
                  <CustomerCard
                    customer={reservation.customer}
                    reservationId={reservation.id}
                  />
                </TabsContent>

                {/* Tab: Activity */}
                <TabsContent value="activity" className="mt-0">
                  <RiskScoreSection reservation={reservation} />
                  <AuditLogTimeline reservationId={reservation.id} />
                </TabsContent>
              </Tabs>
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

          {/* Refund confirm dialog */}
          {reservation && (
            <ConfirmDialog
              open={refundDialogOpen}
              onOpenChange={setRefundDialogOpen}
              title="Terugbetalen"
              description={`Weet je zeker dat je €${((reservation.payment_amount ?? 0) / 100).toFixed(2)} wilt terugbetalen?`}
              confirmLabel="Terugbetalen"
              variant="destructive"
              isLoading={mollieRefund.isPending}
              onConfirm={() => {
                mollieRefund.mutate({ reservationId: reservation.id }, {
                  onSuccess: () => setRefundDialogOpen(false),
                });
              }}
            />
          )}
        </>
      )}
    </NestoPanel>
  );
}
