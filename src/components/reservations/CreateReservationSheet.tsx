import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserPlus, Search, Footprints, ChevronRight, ChevronLeft, AlertTriangle, Check, CalendarIcon, Clock, Sparkles } from 'lucide-react';
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
import { useReservationSettings } from '@/hooks/useReservationSettings';
import { useAssignTable } from '@/hooks/useAssignTable';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { checkTimeConflict, formatTime, timeToMinutes } from '@/lib/reservationUtils';
import { formatDateShort } from '@/lib/datetime';
import { nestoToast } from '@/lib/nestoToast';
import { format, parse, getISODay } from 'date-fns';
import { nl } from 'date-fns/locale';
import type { Customer, ReservationStatus, ReservationChannel, AssignTableResult } from '@/types/reservation';

function generateTimeOptions(start: string, end: string, stepMinutes: number): string[] {
  const options: string[] = [];
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let current = startH * 60 + startM;
  const last = endH * 60 + endM;
  while (current <= last) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    current += stepMinutes;
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions('11:00', '23:45', 15);

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
  const [date, setDate] = useState<Date>(defaultDate || new Date());
  const [shiftId, setShiftId] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [startTime, setStartTime] = useState('19:00');
  const [tableId, setTableId] = useState<string | null>(null);
  const [tableMode, setTableMode] = useState<'auto' | 'manual' | 'none'>('auto');
  const [channel, setChannel] = useState<ReservationChannel>('operator');
  const [guestNotes, setGuestNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [initialStatus, setInitialStatus] = useState<ReservationStatus>('confirmed');
  const [preview, setPreview] = useState<AssignTableResult | null>(null);

  const { data: customers = [] } = useCustomers(searchTerm);
  const createCustomer = useCreateCustomer();
  const createReservation = useCreateReservation();
  const assignTable = useAssignTable();
  const { data: shifts = [] } = useShifts(locationId);
  const { data: shiftTickets = [] } = useShiftTickets(shiftId || undefined);
  const { data: areasWithTables = [] } = useAreasWithTables(locationId);
  const { data: settings } = useReservationSettings(locationId);
  const dateString = format(date, 'yyyy-MM-dd');
  const { data: reservationsForDate = [] } = useReservations({ date: dateString });

  // Set default table mode based on auto_assign setting
  useEffect(() => {
    setTableMode(settings?.auto_assign ? 'auto' : 'none');
  }, [settings?.auto_assign]);

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

  // Effective duration for filtering
  const effectiveDuration = useMemo(() => {
    if (!ticketId || !shiftId) return null;
    const st = shiftTickets.find(s => s.ticket_id === ticketId);
    return st?.override_duration_minutes ?? 120;
  }, [ticketId, shiftId, shiftTickets]);

  // Preview auto-assign (debounced)
  const latestRequestRef = useRef(0);
  const fetchPreview = useDebouncedCallback(useCallback(async () => {
    if (tableMode !== 'auto' || !locationId || !shiftId || !ticketId || !effectiveDuration) {
      setPreview(null);
      return;
    }
    const requestId = ++latestRequestRef.current;
    try {
      const result = await assignTable.mutateAsync({
        location_id: locationId,
        date: dateString,
        time: startTime,
        party_size: partySize,
        duration_minutes: effectiveDuration,
        shift_id: shiftId,
        ticket_id: ticketId,
      });
      if (requestId !== latestRequestRef.current) return;
      setPreview(result);
    } catch {
      if (requestId !== latestRequestRef.current) return;
      setPreview(null);
    }
  }, [tableMode, locationId, shiftId, ticketId, effectiveDuration, dateString, startTime, partySize, assignTable]), 500);

  useEffect(() => {
    if (tableMode === 'auto' && shiftId && ticketId) {
      fetchPreview();
    } else {
      setPreview(null);
    }
  }, [tableMode, shiftId, ticketId, dateString, startTime, partySize]);

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
      const result = await createReservation.mutateAsync({
        location_id: locationId,
        customer_id: isWalkIn ? null : (selectedCustomer?.id ?? null),
        shift_id: shiftId,
        ticket_id: ticketId,
        reservation_date: format(date, 'yyyy-MM-dd'),
        start_time: startTime,
        party_size: partySize,
        channel,
        table_id: tableMode === 'manual' ? tableId : null,
        guest_notes: guestNotes || null,
        internal_notes: internalNotes || null,
        initial_status: initialStatus,
        squeeze: false,
        actor_id: context?.user_id ?? null,
      });

      // result is a UUID string from create_reservation RPC
      const reservationId = result as string;

      // Auto-assign after creation
      if (tableMode === 'auto' && effectiveDuration && reservationId) {
        try {
          const assignResult = await assignTable.mutateAsync({
            location_id: locationId,
            date: format(date, 'yyyy-MM-dd'),
            time: startTime,
            party_size: partySize,
            duration_minutes: effectiveDuration,
            shift_id: shiftId,
            ticket_id: ticketId,
            reservation_id: reservationId,
          });
          if (assignResult.assigned) {
            nestoToast.success(`Reservering aangemaakt — ${assignResult.table_name} toegewezen`);
          } else {
            nestoToast.warning('Reservering aangemaakt zonder tafel');
          }
        } catch {
          nestoToast.warning('Reservering aangemaakt, tafeltoewijzing mislukt');
        }
      } else {
        nestoToast.success('Reservering aangemaakt');
      }
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        "flex h-10 w-full items-center gap-2 rounded-button border-[1.5px] border-input bg-background px-3 py-2 text-sm text-left",
                        "hover:bg-muted/50 focus:outline-none focus:!border-primary transition-colors"
                      )}>
                        <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span>{format(date, 'EEE d MMM', { locale: nl })}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => d && setDate(d)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-label text-muted-foreground mb-1.5 block">Tijdslot</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger className="pl-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                <Label className="text-label text-muted-foreground mb-1.5 block">Tafel</Label>
                <Select
                  value={tableMode === 'auto' ? '__auto__' : tableMode === 'manual' && tableId ? tableId : '__none__'}
                  onValueChange={(v) => {
                    if (v === '__auto__') { setTableMode('auto'); setTableId(null); }
                    else if (v === '__none__') { setTableMode('none'); setTableId(null); }
                    else { setTableMode('manual'); setTableId(v); }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__auto__">
                      <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Automatisch toewijzen</span>
                    </SelectItem>
                    <SelectItem value="__none__">Niet toegewezen</SelectItem>
                    {allTables
                      .filter(t => !partySize || (t.min_capacity <= partySize && t.max_capacity >= partySize))
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.display_label} ({t.area_name})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {tableMode === 'auto' && preview && (
                  <p className={cn("text-xs mt-1.5", preview.assigned ? "text-muted-foreground" : "text-warning")}>
                    {preview.assigned
                      ? `Suggestie: ${preview.table_name} (${preview.area_name})`
                      : 'Geen tafel beschikbaar voor deze selectie'}
                  </p>
                )}
              </div>

              {tableMode === 'manual' && overlapWarning && (
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
                <p className="text-sm"><span className="text-muted-foreground">Datum:</span> {format(date, 'd MMM yyyy', { locale: nl })}</p>
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

  // Time-based shift detection (fix: was using s.is_active which picks first active)
  const currentShift = useMemo(() => {
    const now = new Date();
    const currentTimeStr = format(now, 'HH:mm:ss');
    const currentDow = now.getDay() === 0 ? 7 : now.getDay(); // ISO: 1=Mon, 7=Sun
    return shifts.find(s =>
      s.is_active &&
      (s.days_of_week as number[]).includes(currentDow) &&
      currentTimeStr >= s.start_time &&
      currentTimeStr <= s.end_time
    ) || null;
  }, [shifts]);

  const { data: shiftTickets = [] } = useShiftTickets(currentShift?.id);
  const assignTable = useAssignTable();

  const allTables = useMemo(() => {
    return (areasWithTables || []).flatMap((a) =>
      (a.tables || []).map((t) => ({ ...t, area_name: a.name }))
    );
  }, [areasWithTables]);

  const handleSubmit = async () => {
    if (!locationId) return;
    if (!currentShift) {
      nestoToast.error('Geen actieve shift op dit moment');
      return;
    }
    const ticket = shiftTickets.find((st) => st.is_active);
    if (!ticket) {
      nestoToast.error('Geen actief ticket gevonden voor deze shift');
      return;
    }

    const now = new Date();
    const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
    const timeDate = new Date(now);
    timeDate.setMinutes(roundedMinutes, 0, 0);
    const timeStr = `${String(timeDate.getHours()).padStart(2, '0')}:${String(timeDate.getMinutes()).padStart(2, '0')}`;

    try {
      const reservationId = await createReservation.mutateAsync({
        location_id: locationId,
        customer_id: null,
        shift_id: currentShift.id,
        ticket_id: ticket.ticket_id,
        reservation_date: format(new Date(), 'yyyy-MM-dd'),
        start_time: timeStr,
        party_size: partySize,
        channel: 'walk_in',
        table_id: tableId,
        initial_status: 'seated',
        actor_id: context?.user_id ?? null,
      });

      // Auto-assign if no table was manually selected
      if (!tableId && reservationId) {
        const duration = ticket.override_duration_minutes ?? 90;
        try {
          const assignResult = await assignTable.mutateAsync({
            location_id: locationId,
            date: format(new Date(), 'yyyy-MM-dd'),
            time: timeStr,
            party_size: partySize,
            duration_minutes: duration,
            shift_id: currentShift.id,
            ticket_id: ticket.ticket_id,
            reservation_id: reservationId as string,
          });
          if (assignResult.assigned) {
            nestoToast.success(`Walk-in geregistreerd — ${assignResult.table_name} toegewezen`);
          } else {
            nestoToast.warning('Walk-in geregistreerd zonder tafel');
          }
        } catch {
          nestoToast.warning('Walk-in geregistreerd, tafeltoewijzing mislukt');
        }
      } else {
        nestoToast.success('Walk-in geregistreerd');
      }
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
