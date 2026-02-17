import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, isSameDay, isToday } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { NestoButton } from "@/components/polar/NestoButton";

interface DateNavigatorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}

export function DateNavigator({
  selectedDate,
  onDateChange,
  className,
}: DateNavigatorProps) {
  const today = new Date();
  
  // Generate quick day buttons (today + next 3 days)
  const quickDays = Array.from({ length: 4 }, (_, i) => addDays(today, i));

  const handlePrevDay = () => {
    onDateChange(addDays(selectedDate, -1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(selectedDate, 1));
  };

  const formatQuickDay = (date: Date): string => {
    if (isToday(date)) return "Vandaag";
    return format(date, "EEEEEE", { locale: nl });
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Prev/Next with current date */}
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
        <button
          onClick={handlePrevDay}
          className="p-1.5 rounded-md hover:bg-background/50 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <span className="px-3 text-sm font-medium text-foreground min-w-[120px] text-center">
          {format(selectedDate, "EEE d MMM", { locale: nl })}
        </span>
        
        <button
          onClick={handleNextDay}
          className="p-1.5 rounded-md hover:bg-background/50 transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Quick day buttons */}
      <div className="flex items-center gap-1">
        {quickDays.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          return (
            <NestoButton
              key={date.toISOString()}
              variant={isSelected ? "primary" : "ghost"}
              size="sm"
              onClick={() => onDateChange(date)}
              className={cn(
                "min-w-[60px]",
                !isSelected && "text-muted-foreground"
              )}
            >
              {formatQuickDay(date)}
            </NestoButton>
          );
        })}
      </div>
    </div>
  );
}
