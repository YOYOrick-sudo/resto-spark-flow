import { useMemo } from "react";
import { format, startOfYear, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isAfter, startOfToday } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DayBucket } from "@/hooks/useChecklistLogboek";

interface LogboekYearGridProps {
  year: number;
  byDate: Map<string, DayBucket>;
  onSelectMonth: (monthDate: Date) => void;
}

export function LogboekYearGrid({ year, byDate, onSelectMonth }: LogboekYearGridProps) {
  const today = startOfToday();
  const months = useMemo(() => {
    const base = startOfYear(new Date(year, 0, 1));
    return Array.from({ length: 12 }, (_, i) => addMonths(base, i));
  }, [year]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {months.map((m) => {
        const days = eachDayOfInterval({ start: startOfMonth(m), end: endOfMonth(m) });
        let runs = 0;
        let openDays = 0;
        let completedDays = 0;
        for (const d of days) {
          if (isAfter(d, today)) continue;
          const k = format(d, "yyyy-MM-dd");
          const b = byDate.get(k);
          if (!b || b.isClosed) continue;
          openDays += 1;
          if (b.runs.length > 0) {
            runs += b.runs.length;
            const allDone = b.runs.every((r) => !!r.afgerond_op);
            if (allDone) completedDays += 1;
          }
        }
        const pct = openDays > 0 ? Math.round((completedDays / openDays) * 100) : null;

        return (
          <button
            key={format(m, "yyyy-MM")}
            onClick={() => onSelectMonth(m)}
            className="rounded-lg border border-border bg-card p-4 text-left hover:bg-muted/40 transition-colors"
          >
            <div className="text-sm font-medium capitalize">
              {format(m, "MMMM", { locale: nl })}
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{runs}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              afgeronde runs
            </div>
            {pct !== null && (
              <div
                className={cn(
                  "mt-2 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium",
                  pct >= 80 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" :
                  pct >= 40 ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                              "bg-muted text-muted-foreground"
                )}
              >
                {pct}% completion
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
