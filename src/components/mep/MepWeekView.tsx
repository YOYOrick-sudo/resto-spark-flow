import { useMemo } from "react";
import { format, addDays, startOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { cn } from "@/lib/utils";
import type { MepTask } from "@/hooks/useMepTasks";
import { formatTaskAmount } from "@/utils/mepDisplay";

const MAX_VISIBLE_TASKS = 5;

interface MepWeekViewProps {
  tasks: MepTask[];
  currentDate: string;
  onSelectDate: (date: string) => void;
  onTaskClick: (task: MepTask) => void;
  isLoading: boolean;
}

export function MepWeekView({
  tasks,
  currentDate,
  onSelectDate,
  onTaskClick,
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
          <div key={i} className="h-[200px] bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(({ date, dateStr, dayTasks, completed, total }) => {
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === currentDate;
        const allDone = total > 0 && completed === total;
        const visibleTasks = dayTasks.slice(0, MAX_VISIBLE_TASKS);
        const remaining = total - MAX_VISIBLE_TASKS;

        return (
          <div
            key={dateStr}
            onClick={() => onSelectDate(dateStr)}
            className={cn(
              "rounded-lg border min-h-[200px] flex flex-col cursor-pointer transition-all",
              isSelected
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/40",
              isToday && !isSelected && "ring-1 ring-primary/30",
            )}
          >
            {/* Day header */}
            <div className="flex items-center justify-between px-2.5 py-2 border-b border-border/50">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {format(date, "EEE", { locale: nl })}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isToday && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs",
                  )}
                >
                  {format(date, "d")}
                </span>
              </div>
              {total > 0 && (
                <NestoBadge
                  variant={allDone ? "success" : "default"}
                  size="sm"
                >
                  {completed}/{total}
                </NestoBadge>
              )}
            </div>

            {/* Tasks list */}
            <div className="flex-1 p-1.5 space-y-0.5">
              {visibleTasks.map((task) => {
                const isDone = task.status === "completed";
                const isCancelled = task.status === "cancelled";
                const isOverdue = task.task_date < todayStr && !isDone && !isCancelled;

                return (
                  <button
                    key={task.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTaskClick(task);
                    }}
                    className={cn(
                      "w-full flex items-center gap-1.5 py-1.5 px-2 rounded text-left transition-colors text-xs",
                      isDone
                        ? "text-success/70 hover:bg-success/5"
                        : isOverdue
                          ? "text-destructive font-medium hover:bg-destructive/5"
                          : "text-foreground hover:bg-accent",
                    )}
                  >
                    <span
                      className={cn(
                        "flex-1 truncate",
                        isDone && "line-through",
                      )}
                    >
                      {task.title}
                    </span>
                    {(() => {
                      const amount = formatTaskAmount(task);
                      return amount ? (
                        <span className="shrink-0 text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded tabular-nums">
                          {amount}
                        </span>
                      ) : null;
                    })()}
                  </button>
                );
              })}

              {remaining > 0 && (
                <div className="px-2 py-1">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    +{remaining} meer
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
