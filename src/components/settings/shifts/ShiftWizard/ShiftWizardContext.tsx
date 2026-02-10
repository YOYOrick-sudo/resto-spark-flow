import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { Shift, ArrivalInterval } from "@/types/shifts";
import type { ShiftTicketRow } from "@/hooks/useShiftTickets";

// ============================================
// Shift-Ticket Override interface
// ============================================

export interface ShiftTicketOverrides {
  ticketId: string;
  overrideDuration: number | null;
  overrideBuffer: number | null;
  overrideMinParty: number | null;
  overrideMaxParty: number | null;
  pacingLimit: number | null;
  seatingLimitGuests: number | null;
  seatingLimitReservations: number | null;
  ignorePacing: boolean;
  areas: string[] | null;
  showAreaName: boolean;
  squeezeEnabled: boolean;
  squeezeDuration: number | null;
  squeezeGap: number | null;
  squeezeFixedEndTime: string | null;
  squeezeLimit: number | null;
  showEndTime: boolean;
  waitlistEnabled: boolean;
}

function createDefaultOverrides(ticketId: string): ShiftTicketOverrides {
  return {
    ticketId,
    overrideDuration: null,
    overrideBuffer: null,
    overrideMinParty: null,
    overrideMaxParty: null,
    pacingLimit: null,
    seatingLimitGuests: null,
    seatingLimitReservations: null,
    ignorePacing: false,
    areas: null,
    showAreaName: false,
    squeezeEnabled: false,
    squeezeDuration: null,
    squeezeGap: null,
    squeezeFixedEndTime: null,
    squeezeLimit: null,
    showEndTime: false,
    waitlistEnabled: false,
  };
}

function shiftTicketRowToOverrides(row: ShiftTicketRow): ShiftTicketOverrides {
  return {
    ticketId: row.ticket_id,
    overrideDuration: row.override_duration_minutes,
    overrideBuffer: row.override_buffer_minutes,
    overrideMinParty: row.override_min_party,
    overrideMaxParty: row.override_max_party,
    pacingLimit: row.pacing_limit,
    seatingLimitGuests: row.seating_limit_guests,
    seatingLimitReservations: row.seating_limit_reservations,
    ignorePacing: row.ignore_pacing,
    areas: row.areas,
    showAreaName: row.show_area_name,
    squeezeEnabled: row.squeeze_enabled,
    squeezeDuration: row.squeeze_duration_minutes,
    squeezeGap: row.squeeze_gap_minutes,
    squeezeFixedEndTime: row.squeeze_to_fixed_end_time,
    squeezeLimit: row.squeeze_limit_per_shift,
    showEndTime: row.show_end_time,
    waitlistEnabled: row.waitlist_enabled,
  };
}

// ============================================
// State & Context
// ============================================

export interface ShiftWizardState {
  // Step 1: Times
  name: string;
  shortName: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  interval: ArrivalInterval;
  color: string;

  // Step 2: Tickets
  selectedTickets: string[];

  // Step 3: Per-ticket overrides (keyed by ticket ID)
  ticketOverrides: Record<string, ShiftTicketOverrides>;

  // Read-only: initial shift_tickets for diff calculation on save
  initialShiftTickets: ShiftTicketRow[];

  // Wizard navigation
  currentStep: number;
  completedSteps: Set<number>;

  // Mode
  editingShift: Shift | null;
  locationId: string;
  isSubmitting: boolean;
  error: string;
}

interface ShiftWizardContextValue extends ShiftWizardState {
  // Setters for Step 1
  setName: (name: string) => void;
  setShortName: (shortName: string) => void;
  setStartTime: (time: string) => void;
  setEndTime: (time: string) => void;
  setDaysOfWeek: (days: number[]) => void;
  toggleDay: (day: number) => void;
  setInterval: (interval: ArrivalInterval) => void;
  setColor: (color: string) => void;

  // Setters for Step 2
  toggleTicket: (ticketId: string) => void;

  // Setters for Step 3: overrides
  setTicketOverride: (ticketId: string, field: keyof ShiftTicketOverrides, value: any) => void;
  resetTicketOverride: (ticketId: string, field: keyof ShiftTicketOverrides) => void;
  getEffectiveValue: <T>(ticketId: string, field: keyof ShiftTicketOverrides, ticketDefault: T) => T;

  // Navigation
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  markStepComplete: (step: number) => void;

  // Actions
  setError: (error: string) => void;
  setIsSubmitting: (submitting: boolean) => void;
  reset: () => void;

  // Computed
  isEditing: boolean;
  canProceed: boolean;
  stepSummaries: Record<number, string>;
}

const ShiftWizardContext = createContext<ShiftWizardContextValue | null>(null);

const DEFAULT_COLOR = "#1d979e";
export const TOTAL_STEPS = 5;

interface ShiftWizardProviderProps {
  children: ReactNode;
  locationId: string;
  editingShift: Shift | null;
  initialShiftTickets?: ShiftTicketRow[];
}

export function ShiftWizardProvider({
  children,
  locationId,
  editingShift,
  initialShiftTickets = [],
}: ShiftWizardProviderProps) {
  const [state, setState] = useState<ShiftWizardState>(() => {
    // Build initial selectedTickets and ticketOverrides from existing shift_tickets
    const initialSelectedTickets = initialShiftTickets.map((st) => st.ticket_id);
    const initialOverrides: Record<string, ShiftTicketOverrides> = {};
    initialShiftTickets.forEach((st) => {
      initialOverrides[st.ticket_id] = shiftTicketRowToOverrides(st);
    });

    return {
      name: editingShift?.name ?? "",
      shortName: editingShift?.short_name ?? "",
      startTime: editingShift?.start_time?.slice(0, 5) ?? "12:00",
      endTime: editingShift?.end_time?.slice(0, 5) ?? "15:00",
      daysOfWeek: editingShift?.days_of_week ?? [1, 2, 3, 4, 5],
      interval: (editingShift?.arrival_interval_minutes ?? 15) as ArrivalInterval,
      color: editingShift?.color ?? DEFAULT_COLOR,
      selectedTickets: initialSelectedTickets,
      ticketOverrides: initialOverrides,
      initialShiftTickets,
      currentStep: 0,
      completedSteps: new Set<number>(),
      editingShift,
      locationId,
      isSubmitting: false,
      error: "",
    };
  });

  // Step 1 setters
  const setName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, name }));
  }, []);

  const setShortName = useCallback((shortName: string) => {
    setState((prev) => ({ ...prev, shortName }));
  }, []);

  const setStartTime = useCallback((startTime: string) => {
    setState((prev) => ({ ...prev, startTime }));
  }, []);

  const setEndTime = useCallback((endTime: string) => {
    setState((prev) => ({ ...prev, endTime }));
  }, []);

  const setDaysOfWeek = useCallback((daysOfWeek: number[]) => {
    setState((prev) => ({ ...prev, daysOfWeek }));
  }, []);

  const toggleDay = useCallback((day: number) => {
    setState((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day].sort(),
    }));
  }, []);

  const setInterval = useCallback((interval: ArrivalInterval) => {
    setState((prev) => ({ ...prev, interval }));
  }, []);

  const setColor = useCallback((color: string) => {
    setState((prev) => ({ ...prev, color }));
  }, []);

  // Step 2: toggle ticket selection
  const toggleTicket = useCallback((ticketId: string) => {
    setState((prev) => {
      const isSelected = prev.selectedTickets.includes(ticketId);
      const newSelectedTickets = isSelected
        ? prev.selectedTickets.filter((t) => t !== ticketId)
        : [...prev.selectedTickets, ticketId];

      // Initialize default overrides for newly selected ticket
      const newOverrides = { ...prev.ticketOverrides };
      if (!isSelected && !newOverrides[ticketId]) {
        newOverrides[ticketId] = createDefaultOverrides(ticketId);
      }

      return {
        ...prev,
        selectedTickets: newSelectedTickets,
        ticketOverrides: newOverrides,
      };
    });
  }, []);

  // Step 3: override management
  const setTicketOverride = useCallback(
    (ticketId: string, field: keyof ShiftTicketOverrides, value: any) => {
      setState((prev) => ({
        ...prev,
        ticketOverrides: {
          ...prev.ticketOverrides,
          [ticketId]: {
            ...(prev.ticketOverrides[ticketId] ?? createDefaultOverrides(ticketId)),
            [field]: value,
          },
        },
      }));
    },
    []
  );

  const resetTicketOverride = useCallback(
    (ticketId: string, field: keyof ShiftTicketOverrides) => {
      setState((prev) => ({
        ...prev,
        ticketOverrides: {
          ...prev.ticketOverrides,
          [ticketId]: {
            ...(prev.ticketOverrides[ticketId] ?? createDefaultOverrides(ticketId)),
            [field]: field === "ignorePacing" || field === "showAreaName" || field === "squeezeEnabled" || field === "showEndTime" || field === "waitlistEnabled"
              ? false
              : null,
          },
        },
      }));
    },
    []
  );

  const getEffectiveValue = useCallback(
    <T,>(ticketId: string, field: keyof ShiftTicketOverrides, ticketDefault: T): T => {
      const override = state.ticketOverrides[ticketId]?.[field];
      if (override !== null && override !== undefined) return override as T;
      return ticketDefault;
    },
    [state.ticketOverrides]
  );

  // Navigation
  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < TOTAL_STEPS) {
      setState((prev) => ({ ...prev, currentStep: step, error: "" }));
    }
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep < TOTAL_STEPS - 1) {
        const newCompleted = new Set(prev.completedSteps);
        newCompleted.add(prev.currentStep);
        return { ...prev, currentStep: prev.currentStep + 1, completedSteps: newCompleted, error: "" };
      }
      return prev;
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStep > 0) {
        return { ...prev, currentStep: prev.currentStep - 1, error: "" };
      }
      return prev;
    });
  }, []);

  const markStepComplete = useCallback((step: number) => {
    setState((prev) => {
      const newCompleted = new Set(prev.completedSteps);
      newCompleted.add(step);
      return { ...prev, completedSteps: newCompleted };
    });
  }, []);

  // Actions
  const setError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setIsSubmitting = useCallback((isSubmitting: boolean) => {
    setState((prev) => ({ ...prev, isSubmitting }));
  }, []);

  const reset = useCallback(() => {
    setState({
      name: "",
      shortName: "",
      startTime: "12:00",
      endTime: "15:00",
      daysOfWeek: [1, 2, 3, 4, 5],
      interval: 15,
      color: DEFAULT_COLOR,
      selectedTickets: [],
      ticketOverrides: {},
      initialShiftTickets: [],
      currentStep: 0,
      completedSteps: new Set<number>(),
      editingShift: null,
      locationId,
      isSubmitting: false,
      error: "",
    });
  }, [locationId]);

  // Computed values
  const isEditing = !!editingShift;

  const canProceed = useMemo(() => {
    switch (state.currentStep) {
      case 0: // Times
        return state.name.trim().length > 0 && state.startTime < state.endTime && state.daysOfWeek.length > 0;
      case 1: // Tickets
        return state.selectedTickets.length > 0;
      case 2: // Configuration (all optional, defaults apply)
        return true;
      case 3: // Capacity (preview)
        return true;
      case 4: // Review
        return true;
      default:
        return false;
    }
  }, [state.currentStep, state.name, state.startTime, state.endTime, state.daysOfWeek, state.selectedTickets]);

  const stepSummaries = useMemo(() => {
    const formatTime = (time: string) => time.slice(0, 5);

    // Count overrides with non-null/non-default values
    const overridesConfigured = Object.values(state.ticketOverrides).filter((o) => {
      // Only count overrides for selected tickets
      if (!state.selectedTickets.includes(o.ticketId)) return false;
      return (
        o.overrideDuration !== null ||
        o.overrideBuffer !== null ||
        o.overrideMinParty !== null ||
        o.overrideMaxParty !== null ||
        o.pacingLimit !== null ||
        o.seatingLimitGuests !== null ||
        o.seatingLimitReservations !== null ||
        o.ignorePacing ||
        o.areas !== null ||
        o.showAreaName ||
        o.squeezeEnabled ||
        o.showEndTime ||
        o.waitlistEnabled
      );
    }).length;

    return {
      0: state.name
        ? `${formatTime(state.startTime)} – ${formatTime(state.endTime)}`
        : "Niet ingesteld",
      1: state.selectedTickets.length > 0
        ? `${state.selectedTickets.length} ticket${state.selectedTickets.length !== 1 ? "s" : ""}`
        : "Geen",
      2: overridesConfigured > 0
        ? `${overridesConfigured} aangepast`
        : "Standaard",
      3: "Standaard",
      4: state.name ? "Klaar" : "Wachten...",
    };
  }, [state.name, state.startTime, state.endTime, state.selectedTickets, state.ticketOverrides]);

  const value: ShiftWizardContextValue = {
    ...state,
    setName,
    setShortName,
    setStartTime,
    setEndTime,
    setDaysOfWeek,
    toggleDay,
    setInterval,
    setColor,
    toggleTicket,
    setTicketOverride,
    resetTicketOverride,
    getEffectiveValue,
    goToStep,
    nextStep,
    prevStep,
    markStepComplete,
    setError,
    setIsSubmitting,
    reset,
    isEditing,
    canProceed,
    stepSummaries,
  };

  return (
    <ShiftWizardContext.Provider value={value}>
      {children}
    </ShiftWizardContext.Provider>
  );
}

export function useShiftWizard() {
  const context = useContext(ShiftWizardContext);
  if (!context) {
    throw new Error("useShiftWizard must be used within ShiftWizardProvider");
  }
  return context;
}
