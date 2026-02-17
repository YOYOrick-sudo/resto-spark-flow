import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Search, Footprints, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomers } from '@/hooks/useCustomers';
import { useCreateCustomer } from '@/hooks/useCreateCustomer';
import { useCreateReservation } from '@/hooks/useCreateReservation';
import { useShifts } from '@/hooks/useShifts';
import { useShiftTickets } from '@/hooks/useShiftTickets';
import { useAreasWithTables } from '@/hooks/useAreasWithTables';
import { useUserContext } from '@/contexts/UserContext';
import { useReservations } from '@/hooks/useReservations';
import { checkTimeConflict } from '@/lib/reservationUtils';
import { nestoToast } from '@/lib/nestoToast';
import { format } from 'date-fns';
import type { Customer, ReservationStatus, ReservationChannel } from '@/types/reservation';

interface CreateReservationSheetProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: Date;
}

type Step = 'customer' | 'details' | 'confirm';

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
  const [squeeze, setSqueeze] = useState(false);
  const [initialStatus, setInitialStatus] = useState<ReservationStatus>('confirmed');

  const { data: customers = [] } = useCustomers(searchTerm);
  const createCustomer = useCreateCustomer();
  const createReservation = useCreateReservation();
  const { data: shifts = [] } = useShifts(locationId);
  const { data: shiftTickets = [] } = useShiftTickets(shiftId || undefined);
  const { data: areasWithTables = [] } = useAreasWithTables(locationId);
  const { data: reservationsForDate = [] } = useReservations({ date });

  // Overlap warning
  const overlapWarning = useMemo(() => {
    if (!tableId || !startTime) return null;
    const result = checkTimeConflict(reservationsForDate, tableId, startTime, startTime); // simplified
    return result.hasConflict ? result.conflictingReservation : null;
  }, [tableId, startTime, reservationsForDate]);

  const allTables = useMemo(() => {
    return (areasWithTables || []).flatMap((a) =>
      (a.tables || []).map((t) => ({ ...t, area_name: a.name }))
    );
  }, [areasWithTables]);

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
    setSqueeze(false); setInitialStatus('confirmed');
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
        squeeze,
        actor_id: context?.user_id ?? null,
      });
      nestoToast.success('Reservering aangemaakt');
      handleClose();
    } catch (err: any) {
      nestoToast.error(err.message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border/50">
          <SheetTitle className="text-base">
            {step === 'customer' && 'Stap 1: Klant'}
            {step === 'details' && 'Stap 2: Details'}
            {step === 'confirm' && 'Stap 3: Bevestig'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {/* STEP 1: Customer */}
          {step === 'customer' && (
            <div className="space-y-4">
              {/* Walk-in option */}
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

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek klant op naam, email of telefoon..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Results */}
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
                    <span className="text-xs text-muted-foreground">{c.total_visits} bezoeken</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>

              {/* New customer */}
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
                  <button
                    onClick={handleCreateCustomer}
                    disabled={!newFirst || !newLast || createCustomer.isPending}
                    className="w-full px-3 py-2 text-sm font-medium rounded-button bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    Aanmaken & doorgaan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Details */}
          {step === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1.5 block">Datum</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Tijdslot</Label>
                  <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} step="900" />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Shift</Label>
                <Select value={shiftId} onValueChange={setShiftId}>
                  <SelectTrigger><SelectValue placeholder="Kies shift" /></SelectTrigger>
                  <SelectContent>
                    {shifts.filter((s) => s.is_active).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Ticket</Label>
                <Select value={ticketId} onValueChange={setTicketId}>
                  <SelectTrigger><SelectValue placeholder="Kies ticket" /></SelectTrigger>
                  <SelectContent>
                    {shiftTickets.filter((st) => st.is_active).map((st) => (
                      <SelectItem key={st.ticket_id} value={st.ticket_id}>
                        {st.tickets?.name || st.ticket_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1.5 block">Aantal personen</Label>
                  <Input type="number" min={1} max={20} value={partySize} onChange={e => setPartySize(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Kanaal</Label>
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
                <Label className="text-xs mb-1.5 block">Tafel (optioneel)</Label>
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

              {/* Overlap warning */}
              {overlapWarning && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
                  <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-warning">
                    Let op: Deze tafel is al bezet om {overlapWarning.start_time}–{overlapWarning.end_time}.
                  </p>
                </div>
              )}

              <div>
                <Label className="text-xs mb-1.5 block">Gast notities</Label>
                <textarea className="w-full rounded-button border-[1.5px] border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus-visible:outline-none focus-visible:!border-primary" value={guestNotes} onChange={e => setGuestNotes(e.target.value)} />
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Interne notities</Label>
                <textarea className="w-full rounded-button border-[1.5px] border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-none focus-visible:outline-none focus-visible:!border-primary" value={internalNotes} onChange={e => setInternalNotes(e.target.value)} />
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={squeeze} onCheckedChange={setSqueeze} />
                <Label className="text-sm">Squeeze reservering</Label>
              </div>
            </div>
          )}

          {/* STEP 3: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                <p className="text-sm"><span className="text-muted-foreground">Klant:</span> {isWalkIn ? 'Walk-in' : selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : '—'}</p>
                <p className="text-sm"><span className="text-muted-foreground">Datum:</span> {date}</p>
                <p className="text-sm"><span className="text-muted-foreground">Tijd:</span> {startTime}</p>
                <p className="text-sm"><span className="text-muted-foreground">Personen:</span> {partySize}</p>
                <p className="text-sm"><span className="text-muted-foreground">Kanaal:</span> {channel}</p>
                {squeeze && <p className="text-sm text-primary font-medium">Squeeze reservering</p>}
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Initiële status</Label>
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

        {/* Footer */}
        <div className="p-4 border-t border-border/50 flex gap-2">
          {step !== 'customer' && (
            <button
              onClick={() => setStep(step === 'confirm' ? 'details' : 'customer')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-button border border-input bg-background hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Terug
            </button>
          )}
          {step === 'details' && (
            <button
              onClick={() => setStep('confirm')}
              disabled={!shiftId || !ticketId}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-button bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Doorgaan
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {step === 'confirm' && (
            <button
              onClick={handleSubmit}
              disabled={createReservation.isPending}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-button bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createReservation.isPending ? 'Bezig...' : 'Reservering aanmaken'}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Walk-in shortcut component
interface WalkInShortcutProps {
  onSubmit: () => void;
  className?: string;
}

export function WalkInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentLocation, context } = useUserContext();
  const locationId = currentLocation?.id;
  const [partySize, setPartySize] = useState(2);
  const [tableId, setTableId] = useState<string | null>(null);

  const { data: shifts = [] } = useShifts(locationId);
  const { data: areasWithTables = [] } = useAreasWithTables(locationId);
  const createReservation = useCreateReservation();

  // Pick first active shift's first ticket
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
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-[360px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border/50">
          <SheetTitle className="text-base flex items-center gap-2">
            <Footprints className="h-5 w-5" />
            Walk-in registreren
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <Label className="text-xs mb-1.5 block">Aantal personen</Label>
            <Input type="number" min={1} max={20} value={partySize} onChange={e => setPartySize(Number(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs mb-1.5 block">Tafel (optioneel)</Label>
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
            Datum: vandaag • Tijd: nu • Status: direct gezeten • Kanaal: walk-in
          </p>
        </div>
        <div className="p-4 border-t border-border/50">
          <button
            onClick={handleSubmit}
            disabled={createReservation.isPending}
            className="w-full px-4 py-2 text-sm font-medium rounded-button bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {createReservation.isPending ? 'Bezig...' : 'Walk-in registreren'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
