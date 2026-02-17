import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Search, Footprints, ChevronRight, ChevronLeft, AlertTriangle, Check } from 'lucide-react';
import { NestoButton } from '@/components/polar/NestoButton';
import { NestoPanel } from '@/components/polar/NestoPanel';
import { cn } from '@/lib/utils';
import { useCustomers } from '@/hooks/useCustomers';
import { useCreateCustomer } from '@/hooks/useCreateCustomer';
import { useCreateReservation } from '@/hooks/useCreateReservation';
import { useShifts } from '@/hooks/useShifts';
import { useShiftTickets } from '@/hooks/useShiftTickets';
import { useAreasWithTables } from '@/hooks/useAreasWithTables';
import { useUserContext } from '@/contexts/UserContext';
import { useReservations } from '@/hooks/useReservations';
import { checkTimeConflict, formatTime, timeToMinutes } from '@/lib/reservationUtils';
import { formatDateShort } from '@/lib/datetime';
import { nestoToast } from '@/lib/nestoToast';
import { format } from 'date-fns';
import type { Customer, ReservationStatus, ReservationChannel } from '@/types/reservation';

interface CreateReservationSheetProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: Date;
}

type Step = 'customer' | 'details' | 'confirm';

const STEPS: { key: Step; label: string }[] = [
  { key: 'customer', label: 'Klant' },
  { key: 'details', label: 'Details' },
  { key: 'confirm', label: 'Bevestig' },
];

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      {STEPS.map((s, i) => {
        const isActive = s.key === current;
        const isDone = STEPS.findIndex(x => x.key === current) > i;
        return (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <div className={cn("h-px w-6", isDone ? "bg-primary" : "bg-border")} />}
            <div className={cn(
              "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors",
              isActive ? "bg-primary text-primary-foreground" :
              isDone ? "bg-primary/20 text-primary" :
              "bg-muted text-muted-foreground"
            )}>
              {isDone ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className={cn("text-xs font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function CreateReservationSheet({ open, onClose, defaultDate }: CreateReservationSheetProps) {
  const { currentLocation, context } = useUserContext();
  const locationId = currentLocation?.id;
  const [step, setStep] = useState<Step>('customer');

  // Customer selection
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Details
  const [date, setDate] = useState(defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [shiftId, setShiftId] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [startTime, setStartTime] = useState('19:00');
  const [tableId, setTableId] = useState<string | null>(null);
  const [channel, setChannel] = useState<ReservationChannel>('operator');
  const [guestNotes, setGuestNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [initialStatus, setInitialStatus] = useState<ReservationStatus>('confirmed');

  const { data: customers = [] } = useCustomers(searchTerm);
  const createCustomer = useCreateCustomer();
  const createReservation = useCreateReservation();
  const { data: shifts = [] } = useShifts(locationId);
  const { data: shiftTickets = [] } = useShiftTickets(shiftId || undefined);
  const { data: areasWithTables = [] } = useAreasWithTables(locationId);
  const { data: reservationsForDate = [] } = useReservations({ date });

  // Auto-detect shift based on selected time
  const detectedShift = useMemo(() => {
    if (!startTime || shifts.length === 0) return null;
    const startMinutes = timeToMinutes(startTime);
    return shifts.find(s => {
      if (!s.is_active) return false;
      const shiftStart = timeToMinutes(s.start_time);
      const shiftEnd = timeToMinutes(s.end_time);
      if (shiftEnd <= shiftStart) {
        return startMinutes >= shiftStart || startMinutes < shiftEnd;
      }
      return startMinutes >= shiftStart && startMinutes < shiftEnd;
    }) || null;
  }, [startTime, shifts]);

  // Auto-set shiftId when detected shift changes
  useEffect(() => {
    if (detectedShift) {
      setShiftId(detectedShift.id);
    } else {
      setShiftId('');
    }
  }, [detectedShift]);

  // Auto-select ticket if only one active
  useEffect(() => {
    const activeTickets = shiftTickets.filter(st => st.is_active);
    if (activeTickets.length === 1) {
      setTicketId(activeTickets[0].ticket_id);
    } else if (activeTickets.length === 0) {
      setTicketId('');
    }
  }, [shiftTickets]);

  // Overlap warning
  const overlapWarning = useMemo(() => {
    if (!tableId || !startTime) return null;
    const result = checkTimeConflict(reservationsForDate, tableId, startTime, startTime);
    return result.hasConflict ? result.conflictingReservation : null;
  }, [tableId, startTime, reservationsForDate]);

  const allTables = useMemo(() => {
    return (areasWithTables || []).flatMap((a) =>
      (a.tables || []).map((t) => ({ ...t, area_name: a.name }))
    );
  }, [areasWithTables]);

  const activeTickets = useMemo(() => shiftTickets.filter(st => st.is_active), [shiftTickets]);

  const resetForm = () => {
    setStep('customer');
    setSelectedCustomer(null);
    setIsWalkIn(false);
    setShowNewCustomer(false);
    setSearchTerm('');
    setNewFirst(''); setNewLast(''); setNewEmail(''); setNewPhone('');
    setShiftId(''); setTicketId('');
    setPartySize(2); setStartTime('19:00');
    setTableId(null); setChannel('operator');
    setGuestNotes(''); setInternalNotes('');
    setInitialStatus('confirmed');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreateCustomer = async () => {
    if (!locationId || !newFirst || !newLast) return;
    try {
      const data = await createCustomer.mutateAsync({
        location_id: locationId,
        first_name: newFirst,
        last_name: newLast,
        email: newEmail || null,
        phone_number: newPhone || null,
      });
      setSelectedCustomer(data as any);
      setShowNewCustomer(false);
      setStep('details');
    } catch (err: any) {
      nestoToast.error(err.message);
    }
  };

  const handleSubmit = async () => {
    if (!locationId || !shiftId || !ticketId) return;
    try {
      await createReservation.mutateAsync({
        location_id: locationId,
        customer_id: isWalkIn ? null : (selectedCustomer?.id ?? null),
        shift_id: shiftId,
        ticket_id: ticketId,
        reservation_date: date,
        start_time: startTime,
        party_size: partySize,
        channel,
        table_id: tableId,
        guest_notes: guestNotes || null,
        internal_notes: internalNotes || null,
        initial_status: initialStatus,
        squeeze: false,
        actor_id: context?.user_id ?? null,
      });
      nestoToast.success('Reservering aangemaakt');
      handleClose();
    } catch (err: any) {
      nestoToast.error(err.message);
    }
  };

  const stepTitle = step === 'customer' ? 'Klant selecteren'
    : step === 'details' ? 'Reserveringsdetails'
    : 'Bevestig reservering';

  const footerContent = (
    <div className="flex gap-2">
      {step !== 'customer' && (
        <NestoButton
          variant="outline"
          size="sm"
          onClick={() => setStep(step === 'confirm' ? 'details' : 'customer')}
          leftIcon={<ChevronLeft className="h-4 w-4" />}
        >
          Terug
        </NestoButton>
      )}
      {step === 'customer' && (
        <NestoButton variant="ghost" onClick={handleClose}>
          Annuleren
        </NestoButton>
      )}
      {step === 'details' && (
        <NestoButton
          variant="primary"
          className="flex-1"
          onClick={() => setStep('confirm')}
          disabled={!shiftId || !ticketId}
          rightIcon={<ChevronRight className="h-4 w-4" />}
        >
          Doorgaan
        </NestoButton>
      )}
      {step === 'confirm' && (
        <NestoButton
          variant="primary"
          className="flex-1"
          onClick={handleSubmit}
          disabled={createReservation.isPending}
          isLoading={createReservation.isPending}
        >
          Reservering aanmaken
        </NestoButton>
      )}
    </div>
  );

  return (
    <NestoPanel
      open={open}
      onClose={handleClose}
      title={stepTitle}
      width="w-[480px]"
      footer={footerContent}
    >
      {(titleRef) => (
        <div className="p-5 pr-14 space-y-5">
          <div>
            <StepIndicator current={step} />
            <h2 ref={titleRef} className="text-lg font-semibold text-foreground mt-2">
              {stepTitle}
            </h2>
          </div>

          {/* STEP 1: Customer */}
          {step === 'customer' && (
            <div className="space-y-5">
              <button
                onClick={() => { setIsWalkIn(true); setSelectedCustomer(null); setStep('details'); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors text-left"
              >
                <Footprints className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Walk-in (zonder klant)</p>
                  <p className="text-xs text-muted-foreground">Geen klantgegevens nodig</p>
                </div>
              </button>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek klant op naam, email of telefoon..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="space-y-1">
                {customers.slice(0, 10).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCustomer(c); setIsWalkIn(false); setStep('details'); }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email || c.phone_number || '—'}</p>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{c.total_visits} bezoeken</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>

              {!showNewCustomer ? (
                <button
                  onClick={() => setShowNewCustomer(true)}
                  className="w-full flex items-center gap-2 p-2.5 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  Nieuwe klant aanmaken
                </button>
              ) : (
                <div className="space-y-3 p-3 rounded-xl border border-border bg-muted/20">
                  <p className="text-sm font-medium">Nieuwe klant</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Voornaam *" value={newFirst} onChange={e => setNewFirst(e.target.value)} />
                    <Input placeholder="Achternaam *" value={newLast} onChange={e => setNewLast(e.target.value)} />
                  </div>
                  <Input placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                  <Input placeholder="Telefoon" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                  <NestoButton
                    variant="primary"
                    size="sm"
                    onClick={handleCreateCustomer}
                    disabled={!newFirst || !newLast || createCustomer.isPending}
                    isLoading={createCustomer.isPending}
                    className="w-full"
                  >
                    Aanmaken & doorgaan
                  </NestoButton>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Details */}
          {step === 'details' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-label text-muted-foreground mb-1.5 block">Datum</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-label text-muted-foreground mb-1.5 block">Tijdslot</Label>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} step="900" />
                </div>
              </div>

              <div>
                <Label className="text-label text-muted-foreground mb-1.5 block">Shift</Label>
                {detectedShift ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-button border border-border bg-muted/30 text-sm">
                    <span className="font-medium text-foreground">{detectedShift.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatTime(detectedShift.start_time)}–{formatTime(detectedShift.end_time)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-button border border-warning/30 bg-warning/5 text-sm">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                    <span className="text-warning text-xs">Geen shift voor dit tijdslot</span>
                  </div>
                )}
              </div>

              {activeTickets.length > 1 && (
                <div>
                  <Label className="text-label text-muted-foreground mb-1.5 block">Ticket</Label>
                  <Select value={ticketId} onValueChange={setTicketId}>
                    <SelectTrigger><SelectValue placeholder="Kies ticket" /></SelectTrigger>
                    <SelectContent>
                      {activeTickets.map((st) => (
                        <SelectItem key={st.ticket_id} value={st.ticket_id}>
                          {st.tickets?.name || st.ticket_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-label text-muted-foreground mb-1.5 block">Aantal personen</Label>
                  <Input type="number" min={1} max={20} value={partySize} onChange={e => setPartySize(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-label text-muted-foreground mb-1.5 block">Kanaal</Label>
                  <Select value={channel} onValueChange={(v) => setChannel(v as ReservationChannel)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operator">Operator</SelectItem>
                      <SelectItem value="phone">Telefoon</SelectItem>
                      <SelectItem value="widget">Widget</SelectItem>
                      <SelectItem value="walk_in">Walk-in</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-label text-muted-foreground mb-1.5 block">Tafel (optioneel)</Label>
                <Select value={tableId || '__none__'} onValueChange={(v) => setTableId(v === '__none__' ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Niet toegewezen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Niet toegewezen</SelectItem>
                    {allTables.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.display_label} ({t.area_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {overlapWarning && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
                  <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-warning">
                    Let op: Deze tafel is al bezet om {formatTime(overlapWarning.start_time)}–{formatTime(overlapWarning.end_time)}.
                  </p>
                </div>
              )}

              <div>
                <Label className="text-label text-muted-foreground mb-1.5 block">Gast notities</Label>
                <textarea className="w-full rounded-button border-[1.5px] border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus-visible:outline-none focus-visible:!border-primary" value={guestNotes} onChange={e => setGuestNotes(e.target.value)} />
              </div>

              <div>
                <Label className="text-label text-muted-foreground mb-1.5 block">Interne notities</Label>
                <textarea className="w-full rounded-button border-[1.5px] border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus-visible:outline-none focus-visible:!border-primary" value={internalNotes} onChange={e => setInternalNotes(e.target.value)} />
              </div>
            </div>
          )}

          {/* STEP 3: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2.5">
                <p className="text-sm"><span className="text-muted-foreground">Klant:</span> {isWalkIn ? 'Walk-in' : selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : '—'}</p>
                <p className="text-sm"><span className="text-muted-foreground">Datum:</span> {formatDateShort(date)}</p>
                <p className="text-sm"><span className="text-muted-foreground">Tijd:</span> {formatTime(startTime)}</p>
                <p className="text-sm"><span className="text-muted-foreground">Shift:</span> {detectedShift?.name || '—'}</p>
                <p className="text-sm"><span className="text-muted-foreground">Personen:</span> <span className="tabular-nums">{partySize}</span></p>
                <p className="text-sm"><span className="text-muted-foreground">Kanaal:</span> {channel}</p>
                {tableId && (
                  <p className="text-sm"><span className="text-muted-foreground">Tafel:</span> {allTables.find(t => t.id === tableId)?.display_label || '—'}</p>
                )}
              </div>

              <div>
                <Label className="text-label text-muted-foreground mb-1.5 block">Initiële status</Label>
                <Select value={initialStatus} onValueChange={(v) => setInitialStatus(v as ReservationStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Bevestigd</SelectItem>
                    <SelectItem value="draft">Concept</SelectItem>
                    <SelectItem value="option">Optie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}
    </NestoPanel>
  );
}

// Walk-in shortcut component
export function WalkInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentLocation, context } = useUserContext();
  const locationId = currentLocation?.id;
  const [partySize, setPartySize] = useState(2);
  const [tableId, setTableId] = useState<string | null>(null);

  const { data: shifts = [] } = useShifts(locationId);
  const { data: areasWithTables = [] } = useAreasWithTables(locationId);
  const createReservation = useCreateReservation();

  const activeShift = shifts.find((s) => s.is_active);
  const { data: shiftTickets = [] } = useShiftTickets(activeShift?.id);

  const allTables = useMemo(() => {
    return (areasWithTables || []).flatMap((a) =>
      (a.tables || []).map((t) => ({ ...t, area_name: a.name }))
    );
  }, [areasWithTables]);

  const handleSubmit = async () => {
    if (!locationId) return;
    const activeShift = shifts.find((s) => s.is_active);
    const ticket = shiftTickets.find((st) => st.is_active);
    if (!activeShift || !ticket) {
      nestoToast.error('Geen actieve shift of ticket gevonden');
      return;
    }

    const now = new Date();
    const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
    const timeDate = new Date(now);
    timeDate.setMinutes(roundedMinutes, 0, 0);
    const timeStr = `${String(timeDate.getHours()).padStart(2, '0')}:${String(timeDate.getMinutes()).padStart(2, '0')}`;

    try {
      await createReservation.mutateAsync({
        location_id: locationId,
        customer_id: null,
        shift_id: activeShift.id,
        ticket_id: ticket.ticket_id,
        reservation_date: format(new Date(), 'yyyy-MM-dd'),
        start_time: timeStr,
        party_size: partySize,
        channel: 'walk_in',
        table_id: tableId,
        initial_status: 'seated',
        actor_id: context?.user_id ?? null,
      });
      nestoToast.success('Walk-in geregistreerd');
      onClose();
    } catch (err: any) {
      nestoToast.error(err.message);
    }
  };

  return (
    <NestoPanel
      open={open}
      onClose={onClose}
      title="Walk-in registreren"
      width="w-[400px]"
      footer={
        <NestoButton
          variant="primary"
          className="w-full"
          onClick={handleSubmit}
          disabled={createReservation.isPending}
          isLoading={createReservation.isPending}
        >
          Walk-in registreren
        </NestoButton>
      }
    >
      {(titleRef) => (
        <div className="p-5 pr-14 space-y-5">
          <h2 ref={titleRef} className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Footprints className="h-5 w-5" />
            Walk-in registreren
          </h2>

          <div>
            <Label className="text-label text-muted-foreground mb-1.5 block">Aantal personen</Label>
            <Input type="number" min={1} max={20} value={partySize} onChange={e => setPartySize(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-label text-muted-foreground mb-1.5 block">Tafel (optioneel)</Label>
            <Select value={tableId || '__none__'} onValueChange={(v) => setTableId(v === '__none__' ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Niet toegewezen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Niet toegewezen</SelectItem>
                {allTables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.display_label} ({t.area_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Datum: vandaag • Tijd: nu • Status: direct ingecheckt • Kanaal: walk-in
          </p>
        </div>
      )}
    </NestoPanel>
  );
}
