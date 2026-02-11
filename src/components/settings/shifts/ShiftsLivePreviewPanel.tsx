import { useState, useMemo, useEffect } from "react";
import { Calendar, Clock, Info, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { NestoCard } from "@/components/polar";
import { 
  getIsoWeekdayLabels, 
  generateTimeSlots, 
  getDefaultActiveDay,
  formatTimeDisplay 
} from "@/lib/shiftPreview";
import { useAreasWithTables } from "@/hooks/useAreasWithTables";
import type { Shift } from "@/types/shifts";

interface ShiftsLivePreviewPanelProps {
  shifts: Shift[];
  isLoading: boolean;
  locationId: string | undefined;
}

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export function ShiftsLivePreviewPanel({ 
  shifts, 
  isLoading,
  locationId
}: ShiftsLivePreviewPanelProps) {
  const dayLabels = getIsoWeekdayLabels();
  
  // Fetch areas with tables for capacity calculation
  const { data: areas = [] } = useAreasWithTables(locationId);
  
  // Calculate capacity stats
  const capacityStats = useMemo(() => {
    let totalTables = 0;
    let totalMinCapacity = 0;
    let totalMaxCapacity = 0;
    
    areas.forEach(area => {
      area.tables.forEach(table => {
        totalTables++;
        totalMinCapacity += table.min_capacity;
        totalMaxCapacity += table.max_capacity;
      });
    });
    
    return { totalTables, totalMinCapacity, totalMaxCapacity };
  }, [areas]);
  
  // Local state for selected shift and day
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);

  // Get current shift based on selection
  const currentShift = useMemo(() => {
    if (!selectedShiftId) return shifts[0] ?? null;
    return shifts.find(s => s.id === selectedShiftId) ?? shifts[0] ?? null;
  }, [shifts, selectedShiftId]);

  // Update selected shift when shifts change
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
      <NestoCard className="p-5 space-y-4">
        <h4 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
          Live Preview
        </h4>
        <div className="py-8 text-center">
          <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
        </div>
      </NestoCard>
    );
  }

  // Empty state
  if (shifts.length === 0) {
    return (
      <NestoCard className="p-5 space-y-4">
        <h4 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
          Live Preview
        </h4>
        <div className="py-8 text-center space-y-3">
          <div className="flex items-center justify-center rounded-full bg-primary/8 h-12 w-12 mx-auto">
            <Calendar className="h-5 w-5 text-primary/60" />
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
    <NestoCard className="p-5 space-y-5 overflow-hidden">
      {/* Header with subtle gradient accent */}
      <div className="relative">
        <h4 className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
          Live Preview
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          Wat gasten zien bij het reserveren
        </p>
      </div>

      {/* Shift Selector — pill style */}
      <div className="flex flex-wrap gap-1.5">
        {shifts.map((shift) => {
          const isActive = shift.id === currentShift?.id;
          return (
            <button
              key={shift.id}
              onClick={() => setSelectedShiftId(shift.id)}
              className={cn(
                "px-3 py-1.5 rounded-button text-sm font-semibold transition-all duration-150",
                isActive
                  ? "text-white shadow-sm"
                  : "bg-secondary text-muted-foreground hover:bg-accent/60"
              )}
              style={isActive ? { backgroundColor: shift.color } : undefined}
            >
              {shift.short_name}
            </button>
          );
        })}
      </div>

      {/* Day Selector — refined circles */}
      <div className="flex gap-1.5">
        {ALL_DAYS.map((day) => {
          const isAvailable = currentShift?.days_of_week.includes(day) ?? false;
          const isSelected = day === selectedDay && isAvailable;
          
          return (
            <button
              key={day}
              onClick={() => isAvailable && setSelectedDay(day)}
              disabled={!isAvailable}
              className={cn(
                "w-8 h-8 rounded-full text-xs font-semibold transition-all duration-150",
                isSelected && "bg-primary text-primary-foreground shadow-sm",
                !isSelected && isAvailable && "bg-secondary hover:bg-accent/60 text-foreground",
                !isAvailable && "opacity-30 cursor-not-allowed bg-transparent text-muted-foreground"
              )}
            >
              {dayLabels[day]}
            </button>
          );
        })}
      </div>

      {/* Time Slots — grid with visual depth */}
      {currentShift && currentShift.days_of_week.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-xs text-warning flex items-center justify-center gap-1.5">
            <Info className="h-3.5 w-3.5" />
            Geen actieve dagen ingesteld
          </p>
        </div>
      ) : isDayActive ? (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-semibold uppercase tracking-wider">
            <Clock className="h-3 w-3" />
            <span>Beschikbare tijden</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {timeSlots.map((slot) => (
              <span
                key={slot}
                className="px-2.5 py-1.5 rounded-button bg-secondary border border-border/40 text-sm tabular-nums font-medium hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-default"
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
        <div className="py-4 text-center">
          <p className="text-xs text-muted-foreground">
            Selecteer een actieve dag om tijdsloten te zien
          </p>
        </div>
      )}

      {/* Capacity stats — refined */}
      {capacityStats.totalTables > 0 && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground py-2.5 px-3 bg-secondary/60 rounded-button border border-border/30">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary/60" />
            <span className="font-medium">{capacityStats.totalMinCapacity}–{capacityStats.totalMaxCapacity}</span>
            <span>gasten</span>
          </div>
          <div className="w-px h-3 bg-border/60" />
          <span><span className="font-medium">{capacityStats.totalTables}</span> tafels</span>
        </div>
      )}

      {/* Footer — minimal */}
      <div className="pt-3 border-t border-border/40">
        <p className="text-[11px] text-muted-foreground/60 flex items-start gap-1.5">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <span>Preview toont aankomsttijden op basis van shifts.</span>
        </p>
      </div>
    </NestoCard>
  );
}
