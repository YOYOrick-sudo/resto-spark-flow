import { useMemo } from "react";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isAfter, isSameDay, startOfToday } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DayBucket } from "@/hooks/useChecklistLogboek";

interface LogboekWeekStripProps {
  anchorDate: Date;
  byDate: Map<string, DayBucket>;
  onSelectDate: (d: Date) => void;
}

export function LogboekWeekStrip({ anchorDate, byDate, onSelectDate }: LogboekWeekStripProps) {
  const today = startOfToday();
  const days = useMemo(() => {
    const s = startOfWeek(anchorDate, { weekStartsOn: 1 });
    const e = endOfWeek(anchorDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: s, end: e });
  }, [anchorDate]);

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const k = format(d, "yyyy-MM-dd");
        const b = byDate.get(k);
        const isFuture = isAfter(d, today);
        const isToday = isSameDay(d, today);
        const isClosed = b?.isClosed ?? false;
        const allDone = !isFuture && b && b.runs.length > 0 && b.runs.every((r) => !!r.afgerond_op);
        const partial = !isFuture && b && b.runs.length > 0 && !allDone;

        return (
          <button
            key={k}
            onClick={() => onSelectDate(d)}
            className={cn(
              "rounded-lg border border-border bg-card p-3 text-left hover:bg-muted/40 transition-colors min-h-[120px]",
              isToday && "ring-1 ring-primary"
            )}
          >
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {format(d, "EEE", { locale: nl })}
            </div>
            <div className="text-xl font-semibold mt-1 tabular-nums">{format(d, "d")}</div>
            <div className="text-[11px] text-muted-foreground capitalize">
              {format(d, "MMM", { locale: nl })}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              {!isFuture && allDone && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
              {!isFuture && partial && <span className="h-2 w-2 rounded-full bg-amber-500" />}
              {!isFuture && isClosed && (
                <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">Gesloten</span>
              )}
            </div>
            {!isFuture && !isClosed && b && (
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted-foreground">
                  {b.runs.length} run{b.runs.length === 1 ? "" : "s"}
                </span>
                {(() => {
                  if (b.runs.length === 0) return null;
                  const done = b.runs.filter((r) => !!r.afgerond_op).length;
                  const pct = Math.round((done / b.runs.length) * 100);
                  const cls =
                    pct >= 80
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : pct >= 40
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "bg-muted text-muted-foreground";
                  return (
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", cls)}>
                      {pct}%
                    </span>
                  );
                })()}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
