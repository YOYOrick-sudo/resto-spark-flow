import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isAfter,
  startOfToday,
} from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DayBucket } from "@/hooks/useChecklistLogboek";

interface LogboekMonthGridProps {
  anchorDate: Date;
  byDate: Map<string, DayBucket>;
  onSelectDate: (d: Date) => void;
}

const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

function getCompletionStatus(bucket: DayBucket | undefined): "all" | "partial" | "none" {
  if (!bucket || bucket.runs.length === 0) return "none";
  const all = bucket.runs.every((r) => !!r.afgerond_op);
  return all ? "all" : "partial";
}

export function LogboekMonthGrid({ anchorDate, byDate, onSelectDate }: LogboekMonthGridProps) {
  const today = startOfToday();

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [anchorDate]);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium text-center"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const bucket = byDate.get(key);
          const inMonth = isSameMonth(d, anchorDate);
          const isFuture = isAfter(d, today);
          const isToday = isSameDay(d, today);
          const status = getCompletionStatus(bucket);
          const isClosed = bucket?.isClosed ?? false;

          return (
            <button
              key={key}
              onClick={() => onSelectDate(d)}
              className={cn(
                "relative min-h-[88px] p-2 border-b border-r border-border text-left transition-colors hover:bg-muted/40",
                !inMonth && "opacity-40",
                isToday && "bg-primary/5"
              )}
            >
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isFuture && !isToday && "text-muted-foreground",
                    isToday && "text-primary"
                  )}
                >
                  {format(d, "d")}
                </span>
                {!isFuture && status !== "none" && (
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      status === "all" && "bg-emerald-500",
                      status === "partial" && "bg-amber-500"
                    )}
                    aria-label={status === "all" ? "Alles afgerond" : "Gedeeltelijk"}
                  />
                )}
              </div>

              {!isFuture && isClosed && (
                <div className="mt-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                  Gesloten{bucket?.closedLabel ? ` · ${bucket.closedLabel}` : ""}
                </div>
              )}

              {!isFuture && !isClosed && bucket && bucket.runs.length > 0 && (
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {bucket.runs.length} run{bucket.runs.length === 1 ? "" : "s"}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
