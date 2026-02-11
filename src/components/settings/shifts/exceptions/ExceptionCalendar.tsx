import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { nl } from "date-fns/locale";
import { NestoButton } from "@/components/polar/NestoButton";
import { cn } from "@/lib/utils";
import type { ShiftException, ShiftExceptionType } from "@/types/shifts";

interface ExceptionCalendarProps {
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  exceptions: ShiftException[];
  onDayClick: (date: Date, existingExceptions: ShiftException[]) => void;
}

const TYPE_COLORS: Record<ShiftExceptionType, string> = {
  closed: "bg-destructive",
  modified: "bg-orange-500",
  special: "bg-purple-500",
};

export function ExceptionCalendar({
  selectedMonth,
  onMonthChange,
  exceptions,
  onDayClick,
}: ExceptionCalendarProps) {
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Group exceptions by date for quick lookup
  const exceptionsByDate = useMemo(() => {
    const map = new Map<string, ShiftException[]>();
    exceptions.forEach((exc) => {
      const dateKey = exc.exception_date;
      const existing = map.get(dateKey) || [];
      existing.push(exc);
      map.set(dateKey, existing);
    });
    return map;
  }, [exceptions]);

  // Get unique exception types for a date (for dots)
  const getTypesForDate = (date: Date): ShiftExceptionType[] => {
    const dateKey = format(date, "yyyy-MM-dd");
    const dayExceptions = exceptionsByDate.get(dateKey) || [];
    const types = new Set<ShiftExceptionType>();
    dayExceptions.forEach((exc) => types.add(exc.exception_type));
    return Array.from(types);
  };

  const handleDayClick = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const dayExceptions = exceptionsByDate.get(dateKey) || [];
    onDayClick(date, dayExceptions);
  };

  // Get first day of week offset (Monday = 0)
  const firstDayOffset = (monthStart.getDay() + 6) % 7;

  return (
    <div className="w-full max-w-[280px]">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-3">
        <NestoButton
          variant="ghost"
          size="sm"
          onClick={() => onMonthChange(subMonths(selectedMonth, 1))}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </NestoButton>
        <span className="text-sm font-semibold capitalize">
          {format(selectedMonth, "MMMM yyyy", { locale: nl })}
        </span>
        <NestoButton
          variant="ghost"
          size="sm"
          onClick={() => onMonthChange(addMonths(selectedMonth, 1))}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </NestoButton>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((day) => (
          <div
            key={day}
            className="text-center text-xs text-muted-foreground font-semibold py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="h-9" />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const types = getTypesForDate(day);
          const hasExceptions = types.length > 0;
          const isCurrentDay = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              className={cn(
                "h-9 w-full rounded-md text-sm relative flex flex-col items-center justify-center",
                "hover:bg-muted/50 transition-colors",
                isCurrentDay && "ring-1 ring-primary ring-offset-1",
                !isSameMonth(day, selectedMonth) && "text-muted-foreground opacity-50"
              )}
            >
              <span>{format(day, "d")}</span>
              {/* Exception dots */}
              {hasExceptions && (
                <div className="flex gap-0.5 absolute bottom-1">
                  {types.slice(0, 3).map((type) => (
                    <div
                      key={type}
                      className={cn("w-1.5 h-1.5 rounded-full", TYPE_COLORS[type])}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
