import { useState, useMemo, type ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectieGroupProps {
  naam: string;
  done: number;
  total: number;
  isFirst?: boolean;
  children: ReactNode;
}

/**
 * Sectie-blok voor de TakenRun-pagina. Auto-collapse zodra alle items in de
 * sectie afgevinkt zijn. Chef kan de sectie handmatig open klikken voor review.
 * Smooth max-height transitie (~300ms).
 */
export function SectieGroup({ naam, done, total, isFirst, children }: SectieGroupProps) {
  // null = volg auto-gedrag, true = forceer open, false = forceer dicht
  const [manualState, setManualState] = useState<boolean | null>(null);

  const allDone = total > 0 && done === total;
  const open = manualState ?? !allDone;

  const toggle = () => {
    // Bij klik schakelen we tussen geforceerd open/dicht en respecteren we de
    // huidige zichtbare staat als startpunt.
    setManualState(!open);
  };

  const headerLabel = useMemo(() => {
    if (allDone && !open) {
      return (
        <span className="inline-flex items-center gap-1.5 text-success">
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span className="font-medium normal-case tracking-normal">{naam}</span>
          <span className="text-success/70">— klaar</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-2">
        <span className="font-semibold uppercase tracking-wider text-[11px]">{naam}</span>
        <span className="tabular-nums text-muted-foreground/80 text-[11px] font-medium">
          ({done}/{total})
        </span>
      </span>
    );
  }, [allDone, open, naam, done, total]);

  return (
    <div className={cn(!isFirst && "border-t border-border/40")}>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-5 py-2.5 text-xs",
          "bg-muted/20 hover:bg-muted/40 transition-colors text-foreground/80",
          "focus:outline-none focus-visible:bg-muted/40"
        )}
        aria-expanded={open}
      >
        {headerLabel}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
            !open && "-rotate-90"
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="divide-y divide-border/40">{children}</div>
        </div>
      </div>
    </div>
  );
}
