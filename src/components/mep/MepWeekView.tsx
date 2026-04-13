import { useMemo } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { cn } from "@/lib/utils";
import type { MepTask } from "@/hooks/useMepTasks";

interface MepWeekViewProps {
  tasks: MepTask[];
  currentDate: string;
  onSelectDate: (date: string) => void;
  isLoading: boolean;
}

export function MepWeekView({
  tasks,
  currentDate,
  onSelectDate,
  isLoading,
}: MepWeekViewProps) {
  const weekStart = startOfWeek(new Date(currentDate), { weekStartsOn: 1 });

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const dateStr = format(date, "yyyy-MM-dd");
      const dayTasks = tasks.filter((t) => t.task_date === dateStr);
      const completed = dayTasks.filter((t) => t.status === "completed").length;
      const total = dayTasks.length;
      return { date, dateStr, dayTasks, completed, total };
    });
  }, [tasks, weekStart]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(({ date, dateStr, completed, total }) => {
        const isToday = dateStr === format(new Date(), "yyyy-MM-dd");
        const isSelected = dateStr === currentDate;
        const allDone = total > 0 && completed === total;

        return (
          <button
            key={dateStr}
            onClick={() => onSelectDate(dateStr)}
            className={cn(
              "rounded-lg p-3 text-center transition-all min-h-[80px] flex flex-col items-center justify-center gap-1",
              isSelected
                ? "bg-primary text-primary-foreground ring-2 ring-primary"
                : "bg-card border border-border hover:border-primary/50",
              isToday && !isSelected && "ring-1 ring-primary/30",
            )}
          >
            <span className="text-xs font-medium opacity-70">
              {format(date, "EEE", { locale: nl })}
            </span>
            <span className="text-lg font-semibold">
              {format(date, "d")}
            </span>
            {total > 0 && (
              <NestoBadge
                variant={allDone ? "success" : "default"}
                size="sm"
              >
                {completed}/{total}
              </NestoBadge>
            )}
          </button>
        );
      })}
    </div>
  );
}
