import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// Types
// ============================================

export interface WidgetConfig {
  location_id: string;
  location_name: string | null;
  timezone: string;
  primary_color: string;
  logo_url: string | null;
  welcome_text: string | null;
  success_redirect_url: string | null;
  unavailable_text: string;
  show_end_time: boolean;
  show_nesto_branding: boolean;
  booking_questions: BookingQuestion[];
  google_reserve_url: string | null;
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

export interface BookingData {
  date: string | null;            // YYYY-MM-DD
  party_size: number;
  selectedSlot: AvailableSlot | null;
  selectedShift: AvailableShift | null;
}

export type BookingStep = 1 | 2 | 3 | 4;

interface BookingContextValue {
  // Config
  config: WidgetConfig | null;
  configLoading: boolean;
  configError: string | null;

  // Step navigation
  step: BookingStep;
  setStep: (step: BookingStep) => void;
  canGoNext: boolean;

  // Booking data
  data: BookingData;
  setDate: (date: string | null) => void;
  setPartySize: (size: number) => void;
  setSelectedSlot: (slot: AvailableSlot | null, shift: AvailableShift | null) => void;

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

  // Step state
  const [step, setStep] = useState<BookingStep>(1);

  // Booking data
  const [data, setData] = useState<BookingData>({
    date: null,
    party_size: 2,
    selectedSlot: null,
    selectedShift: null,
  });

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
        const { data: result, error } = await supabase.functions.invoke('public-booking-api', {
          body: null,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        // We need to call with query params - use fetch directly
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

  // Determine if user can proceed
  const canGoNext = (() => {
    if (step === 1) return !!data.date && data.party_size > 0;
    if (step === 2) return !!data.selectedSlot;
    return false;
  })();

  return (
    <BookingContext.Provider
      value={{
        config, configLoading, configError,
        step, setStep, canGoNext,
        data, setDate, setPartySize, setSelectedSlot,
        availableShifts, availabilityLoading,
        availableDates, availableDatesLoading,
        loadAvailability, loadAvailableDates,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}
