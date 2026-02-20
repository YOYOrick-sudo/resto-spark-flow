import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';

// ============================================
// Types
// ============================================

export interface TicketInfo {
  id: string;
  name: string;
  display_title: string;
  description: string | null;
  short_description: string | null;
  image_url: string | null;
  min_party_size: number;
  max_party_size: number;
}

export interface WidgetConfig {
  location_id: string;
  location_name: string | null;
  timezone: string;
  primary_color: string;
  accent_color: string;
  widget_style: 'auto' | 'showcase' | 'quick';
  logo_url: string | null;
  welcome_text: string | null;
  success_redirect_url: string | null;
  unavailable_text: string;
  show_end_time: boolean;
  show_nesto_branding: boolean;
  booking_questions: BookingQuestion[];
  google_reserve_url: string | null;
  min_party_size: number;
  max_party_size: number;
  active_ticket_count: number;
  tickets: TicketInfo[];
}

export interface BookingQuestion {
  id: string;
  type: 'text' | 'single_select' | 'multi_select';
  label: string;
  target: 'customer_tags' | 'reservation_tags';
  required?: boolean;
  options?: string[];
}

export interface AvailableSlot {
  time: string;
  available: boolean;
  slot_type: 'normal' | 'squeeze' | null;
  reason_code: string | null;
  ticket_id: string;
  ticket_name: string;
  duration_minutes: number;
}

export interface AvailableShift {
  shift_id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  slots: AvailableSlot[];
}

export interface GuestData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  guest_notes: string;
  booking_answers: Array<{ question_id: string; values: string[] }>;
  honeypot: string;
}

export interface BookingData {
  date: string | null;            // YYYY-MM-DD
  party_size: number;
  selectedSlot: AvailableSlot | null;
  selectedShift: AvailableShift | null;
  selectedTicket: TicketInfo | null;
}

export interface BookingResult {
  success: boolean;
  reservation_id: string;
  manage_token: string | null;
}

export type BookingStep = 1 | 2 | 3;
export type StepName = 'selection' | 'details' | 'confirmation';

const STEP_MAP: Record<StepName, BookingStep> = {
  selection: 1,
  details: 2,
  confirmation: 3,
};

interface BookingContextValue {
  // Config
  config: WidgetConfig | null;
  configLoading: boolean;
  configError: string | null;

  // Step navigation
  totalSteps: number;
  step: BookingStep;
  setStep: (step: BookingStep) => void;
  goToStep: (name: StepName) => void;
  goBack: () => void;
  canGoNext: boolean;

  // Booking data
  data: BookingData;
  setDate: (date: string | null) => void;
  setPartySize: (size: number) => void;
  setSelectedSlot: (slot: AvailableSlot | null, shift: AvailableShift | null) => void;
  setSelectedTicket: (ticket: TicketInfo | null) => void;

  // Guest data
  guestData: GuestData;
  setGuestData: (data: Partial<GuestData>) => void;

  // Booking submission
  bookingResult: BookingResult | null;
  bookingLoading: boolean;
  bookingError: string | null;
  submitBooking: () => Promise<void>;

  // Availability
  availableShifts: AvailableShift[];
  availabilityLoading: boolean;
  availableDates: string[];
  availableDatesLoading: boolean;
  loadAvailability: (date: string, partySize: number) => Promise<void>;
  loadAvailableDates: (year: number, month: number, partySize: number) => Promise<void>;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}

// ============================================
// Provider
// ============================================

interface BookingProviderProps {
  slug: string;
  children: ReactNode;
}

export function BookingProvider({ slug, children }: BookingProviderProps) {
  // Config state
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  // Step state — always 3 steps
  const [step, setStep] = useState<BookingStep>(1);
  const totalSteps = 3;

  // Booking data
  const [data, setData] = useState<BookingData>({
    date: null,
    party_size: 2,
    selectedSlot: null,
    selectedShift: null,
    selectedTicket: null,
  });

  // Guest data
  const [guestData, setGuestDataState] = useState<GuestData>({
    first_name: '', last_name: '', email: '', phone: '', guest_notes: '',
    booking_answers: [], honeypot: '',
  });

  const setGuestData = useCallback((partial: Partial<GuestData>) => {
    setGuestDataState(prev => ({ ...prev, ...partial }));
  }, []);

  // Booking result
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Availability
  const [availableShifts, setAvailableShifts] = useState<AvailableShift[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableDatesLoading, setAvailableDatesLoading] = useState(false);

  // Load config on mount
  useEffect(() => {
    let cancelled = false;
    async function fetchConfig() {
      setConfigLoading(true);
      setConfigError(null);
      try {
        const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-booking-api/config?slug=${encodeURIComponent(slug)}`;
        const res = await fetch(baseUrl, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Widget not found' }));
          throw new Error(err.error || 'Widget not found');
        }
        const configData = await res.json();
        if (!cancelled) setConfig(configData);
      } catch (err: any) {
        if (!cancelled) setConfigError(err.message || 'Failed to load widget');
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    }
    fetchConfig();
    return () => { cancelled = true; };
  }, [slug]);

  // Setters
  const setDate = useCallback((date: string | null) => {
    setData(prev => ({ ...prev, date, selectedSlot: null, selectedShift: null }));
  }, []);

  const setPartySize = useCallback((party_size: number) => {
    setData(prev => ({ ...prev, party_size, selectedSlot: null, selectedShift: null }));
  }, []);

  const setSelectedSlot = useCallback((slot: AvailableSlot | null, shift: AvailableShift | null) => {
    setData(prev => ({ ...prev, selectedSlot: slot, selectedShift: shift }));
  }, []);

  const setSelectedTicket = useCallback((ticket: TicketInfo | null) => {
    setData(prev => ({ ...prev, selectedTicket: ticket, selectedSlot: null, selectedShift: null }));
  }, []);

  // Load availability for a specific date
  const loadAvailability = useCallback(async (date: string, partySize: number) => {
    if (!config) return;
    setAvailabilityLoading(true);
    try {
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-booking-api/availability`;
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          location_id: config.location_id,
          date,
          party_size: partySize,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to load availability');
      setAvailableShifts(result.shifts ?? []);
    } catch {
      setAvailableShifts([]);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [config]);

  // Load available dates for a month
  const loadAvailableDates = useCallback(async (year: number, month: number, partySize: number) => {
    if (!config) return;
    setAvailableDatesLoading(true);
    try {
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-booking-api/availability/month`;
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          location_id: config.location_id,
          year,
          month,
          party_size: partySize,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed');
      setAvailableDates(result.available_dates ?? []);
    } catch {
      setAvailableDates([]);
    } finally {
      setAvailableDatesLoading(false);
    }
  }, [config]);

  // Submit booking
  const submitBooking = useCallback(async () => {
    if (!config || !data.date || !data.selectedSlot || !data.selectedShift) return;
    if (guestData.honeypot) return; // bot trap

    setBookingLoading(true);
    setBookingError(null);
    try {
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-booking-api/book`;
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          location_id: config.location_id,
          date: data.date,
          start_time: data.selectedSlot.time,
          party_size: data.party_size,
          shift_id: data.selectedShift.shift_id,
          ticket_id: data.selectedSlot.ticket_id,
          is_squeeze: data.selectedSlot.slot_type === 'squeeze',
          first_name: guestData.first_name,
          last_name: guestData.last_name,
          email: guestData.email,
          phone: guestData.phone || null,
          guest_notes: guestData.guest_notes || null,
          booking_answers: guestData.booking_answers,
          honeypot: guestData.honeypot,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Booking failed');
      setBookingResult(result);
      setStep(3); // Go to confirmation
    } catch (err: any) {
      setBookingError(err.message || 'Er ging iets mis bij het boeken.');
    } finally {
      setBookingLoading(false);
    }
  }, [config, data, guestData]);

  // Step navigation helpers
  const goToStep = useCallback((name: StepName) => {
    const target = STEP_MAP[name];
    if (target) setStep(target);
  }, []);

  const goBack = useCallback(() => {
    if (step > 1) setStep((step - 1) as BookingStep);
  }, [step]);

  // Determine if user can proceed
  const canGoNext = (() => {
    if (step === 1) return !!data.selectedTicket && !!data.date && !!data.selectedSlot;
    if (step === 2) return !!(guestData.first_name && guestData.last_name && guestData.email);
    return false;
  })();

  return (
    <BookingContext.Provider
      value={{
        config, configLoading, configError,
        totalSteps,
        step, setStep, goToStep, goBack, canGoNext,
        data, setDate, setPartySize, setSelectedSlot, setSelectedTicket,
        guestData, setGuestData,
        bookingResult, bookingLoading, bookingError, submitBooking,
        availableShifts, availabilityLoading,
        availableDates, availableDatesLoading,
        loadAvailability, loadAvailableDates,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}
