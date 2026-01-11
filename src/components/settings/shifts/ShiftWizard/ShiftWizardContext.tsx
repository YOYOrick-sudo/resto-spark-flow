import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { Shift, ArrivalInterval } from "@/types/shifts";

// Mock ticket data
export interface MockTicket {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  isDefault: boolean;
  comingSoon: boolean;
}

export const MOCK_TICKETS: MockTicket[] = [
  {
    id: "regular",
    name: "Reguliere tafel",
    description: "Standaard reservering voor alle gasten",
    enabled: true,
    isDefault: true,
    comingSoon: false,
  },
  {
    id: "high-tea",
    name: "High Tea",
    description: "Speciale high tea ervaring",
    enabled: false,
    isDefault: false,
    comingSoon: true,
  },
  {
    id: "chefs-table",
    name: "Chef's Table",
    description: "Exclusieve ervaring aan de chef's table",
    enabled: false,
    isDefault: false,
    comingSoon: true,
  },
  {
    id: "group-menu",
    name: "Groepsmenu",
    description: "Vast menu voor groepen van 8+",
    enabled: false,
    isDefault: false,
    comingSoon: true,
  },
];

// Areas per ticket state
export interface TicketAreasConfig {
  allAreas: boolean;
  selectedAreaIds: string[];
}

export interface ShiftWizardState {
  // Step 1: Times (real data)
  name: string;
  shortName: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  interval: ArrivalInterval;
  color: string;
  
  // Step 2: Tickets (mock)
  selectedTickets: string[];
  
  // Step 3: Areas per ticket (mock linking, real areas)
  areasByTicket: Record<string, TicketAreasConfig>;
  
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
  
  // Setters for Step 3
  setAreasForTicket: (ticketId: string, config: TicketAreasConfig) => void;
  toggleAreaForTicket: (ticketId: string, areaId: string) => void;
  setAllAreasForTicket: (ticketId: string, allAreas: boolean) => void;
  
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
}

// Create default areas config for all tickets
function createDefaultAreasConfig(ticketIds: string[]): Record<string, TicketAreasConfig> {
  const config: Record<string, TicketAreasConfig> = {};
  ticketIds.forEach(id => {
    config[id] = { allAreas: true, selectedAreaIds: [] };
  });
  return config;
}

export function ShiftWizardProvider({ children, locationId, editingShift }: ShiftWizardProviderProps) {
  const [state, setState] = useState<ShiftWizardState>(() => ({
    // Initialize from editing shift or defaults
    name: editingShift?.name ?? "",
    shortName: editingShift?.short_name ?? "",
    startTime: editingShift?.start_time?.slice(0, 5) ?? "12:00",
    endTime: editingShift?.end_time?.slice(0, 5) ?? "15:00",
    daysOfWeek: editingShift?.days_of_week ?? [1, 2, 3, 4, 5],
    interval: (editingShift?.arrival_interval_minutes ?? 15) as ArrivalInterval,
    color: editingShift?.color ?? DEFAULT_COLOR,
    selectedTickets: ["regular"], // Default ticket always enabled
    areasByTicket: createDefaultAreasConfig(["regular"]),
    currentStep: 0,
    completedSteps: new Set<number>(),
    editingShift,
    locationId,
    isSubmitting: false,
    error: "",
  }));

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

  // Step 2 setters
  const toggleTicket = useCallback((ticketId: string) => {
    setState((prev) => {
      const newSelectedTickets = prev.selectedTickets.includes(ticketId)
        ? prev.selectedTickets.filter((t) => t !== ticketId)
        : [...prev.selectedTickets, ticketId];
      
      // Initialize areas config for newly selected ticket
      const newAreasByTicket = { ...prev.areasByTicket };
      if (!prev.selectedTickets.includes(ticketId) && !newAreasByTicket[ticketId]) {
        newAreasByTicket[ticketId] = { allAreas: true, selectedAreaIds: [] };
      }
      
      return {
        ...prev,
        selectedTickets: newSelectedTickets,
        areasByTicket: newAreasByTicket,
      };
    });
  }, []);

  // Step 3 setters
  const setAreasForTicket = useCallback((ticketId: string, config: TicketAreasConfig) => {
    setState((prev) => ({
      ...prev,
      areasByTicket: { ...prev.areasByTicket, [ticketId]: config },
    }));
  }, []);

  const toggleAreaForTicket = useCallback((ticketId: string, areaId: string) => {
    setState((prev) => {
      const current = prev.areasByTicket[ticketId] ?? { allAreas: true, selectedAreaIds: [] };
      const newSelectedAreaIds = current.selectedAreaIds.includes(areaId)
        ? current.selectedAreaIds.filter((id) => id !== areaId)
        : [...current.selectedAreaIds, areaId];
      
      return {
        ...prev,
        areasByTicket: {
          ...prev.areasByTicket,
          [ticketId]: { ...current, selectedAreaIds: newSelectedAreaIds },
        },
      };
    });
  }, []);

  const setAllAreasForTicket = useCallback((ticketId: string, allAreas: boolean) => {
    setState((prev) => {
      const current = prev.areasByTicket[ticketId] ?? { allAreas: true, selectedAreaIds: [] };
      return {
        ...prev,
        areasByTicket: {
          ...prev.areasByTicket,
          [ticketId]: { ...current, allAreas },
        },
      };
    });
  }, []);

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
      selectedTickets: ["regular"],
      areasByTicket: createDefaultAreasConfig(["regular"]),
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
      case 0: // Times step
        return (
          state.name.trim().length > 0 &&
          state.startTime < state.endTime &&
          state.daysOfWeek.length > 0
        );
      case 1: // Tickets step
        return state.selectedTickets.length > 0;
      case 2: // Areas step (always true, defaults to all areas)
        return true;
      case 3: // Capacity step (always true, it's preview)
        return true;
      case 4: // Review step
        return true;
      default:
        return false;
    }
  }, [state.currentStep, state.name, state.startTime, state.endTime, state.daysOfWeek, state.selectedTickets]);

  const stepSummaries = useMemo(() => {
    const formatTime = (time: string) => time.slice(0, 5);
    
    // Count how many tickets have specific area selections
    const areasConfigured = Object.values(state.areasByTicket).filter(c => !c.allAreas).length;
    
    return {
      0: state.name
        ? `${formatTime(state.startTime)} – ${formatTime(state.endTime)}`
        : "Niet ingesteld",
      1: state.selectedTickets.length > 0
        ? `${state.selectedTickets.length} geselecteerd`
        : "Geen",
      2: areasConfigured > 0
        ? `${areasConfigured} aangepast`
        : "Alle gebieden",
      3: "Standaard regels",
      4: state.name ? "Klaar" : "Wachten...",
    };
  }, [state.name, state.startTime, state.endTime, state.selectedTickets, state.areasByTicket]);

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
    setAreasForTicket,
    toggleAreaForTicket,
    setAllAreasForTicket,
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
