import { useState, useMemo, useEffect } from "react";
import { Calendar, Clock, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NestoCard } from "@/components/polar";
import { 
  getIsoWeekdayLabels, 
  generateTimeSlots, 
  getDefaultActiveDay,
  formatTimeDisplay 
} from "@/lib/shiftPreview";
import type { Shift } from "@/types/shifts";

interface ShiftsLivePreviewPanelProps {
  shifts: Shift[];
  isLoading: boolean;
}

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export function ShiftsLivePreviewPanel({ 
  shifts, 
  isLoading 
}: ShiftsLivePreviewPanelProps) {
  const dayLabels = getIsoWeekdayLabels();
  
  // Local state for selected shift and day
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);

  // Get current shift based on selection
  const currentShift = useMemo(() => {
    if (!selectedShiftId) return shifts[0] ?? null;
    return shifts.find(s => s.id === selectedShiftId) ?? shifts[0] ?? null;
  }, [shifts, selectedShiftId]);

  // Update selected shift when shifts change (e.g., after CRUD)
  useEffect(() => {
    if (shifts.length > 0 && !shifts.find(s => s.id === selectedShiftId)) {
      setSelectedShiftId(shifts[0].id);
    }
  }, [shifts, selectedShiftId]);

  // Update selected day when shift changes
  useEffect(() => {
    if (currentShift) {
      const defaultDay = getDefaultActiveDay(currentShift.days_of_week);
      setSelectedDay(defaultDay);
    }
  }, [currentShift?.id]);

  // Generate time slots for current shift
  const timeSlots = useMemo(() => {
    if (!currentShift) return [];
    return generateTimeSlots(
      currentShift.start_time,
      currentShift.end_time,
      currentShift.arrival_interval_minutes
    );
  }, [currentShift]);

  // Check if selected day is valid for current shift
  const isDayActive = currentShift?.days_of_week.includes(selectedDay) ?? false;

  // Loading state
  if (isLoading) {
    return (
      <NestoCard className="p-4 space-y-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Live Preview
        </h4>
        <div className="py-8 text-center">
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
        </div>
      </NestoCard>
    );
  }

  // Empty state - no active shifts
  if (shifts.length === 0) {
    return (
      <NestoCard className="p-4 space-y-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Live Preview
        </h4>
        <div className="py-6 text-center space-y-3">
          <div className="flex items-center justify-center rounded-full bg-muted h-12 w-12 mx-auto">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Geen shifts geconfigureerd</p>
            <p className="text-xs text-muted-foreground">
              Maak een shift aan om de gastweergave te zien.
            </p>
          </div>
        </div>
      </NestoCard>
    );
  }

  return (
    <NestoCard className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Live Preview
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          Wat gasten zien bij het reserveren
        </p>
      </div>

      {/* Shift Selector */}
      <div className="flex flex-wrap gap-1.5">
        {shifts.map((shift) => (
          <button
            key={shift.id}
            onClick={() => setSelectedShiftId(shift.id)}
            className={cn(
              "px-3 py-1.5 rounded-button text-sm font-medium transition-colors",
              shift.id === currentShift?.id
                ? "text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            style={shift.id === currentShift?.id ? { backgroundColor: shift.color } : undefined}
          >
            {shift.short_name}
          </button>
        ))}
      </div>

      {/* Day Selector */}
      <div className="flex gap-1">
        {ALL_DAYS.map((day) => {
          const isAvailable = currentShift?.days_of_week.includes(day) ?? false;
          const isSelected = day === selectedDay && isAvailable;
          
          return (
            <button
              key={day}
              onClick={() => isAvailable && setSelectedDay(day)}
              disabled={!isAvailable}
              className={cn(
                "w-8 h-8 rounded-full text-xs font-medium transition-colors",
                isSelected && "bg-primary text-primary-foreground",
                !isSelected && isAvailable && "bg-muted hover:bg-accent",
                !isAvailable && "opacity-40 cursor-not-allowed bg-transparent"
              )}
            >
              {dayLabels[day]}
            </button>
          );
        })}
      </div>

      {/* Time Slots */}
      {currentShift && currentShift.days_of_week.length === 0 ? (
        <div className="py-3 text-center">
          <p className="text-xs text-warning flex items-center justify-center gap-1.5">
            <Info className="h-3.5 w-3.5" />
            Geen actieve dagen ingesteld
          </p>
        </div>
      ) : isDayActive ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Beschikbare tijden</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {timeSlots.map((slot) => (
              <span
                key={slot}
                className="px-2 py-1 rounded-control bg-card border text-sm tabular-nums"
              >
                {slot}
              </span>
            ))}
          </div>
          {timeSlots.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Geen tijdsloten (check shift tijden)
            </p>
          )}
        </div>
      ) : (
        <div className="py-3 text-center">
          <p className="text-xs text-muted-foreground">
            Selecteer een actieve dag om tijdsloten te zien
          </p>
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-2 border-t border-border/60">
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>Preview toont aankomsttijden, niet de capaciteit.</span>
        </p>
      </div>
    </NestoCard>
  );
}
