/**
 * Sprint Factuur Enterprise Pass — FactuurBedragDetails
 *
 * Collapsible BTW-breakdown onder de factuur-samenvatting.
 * Default DICHT — chef ziet alleen "Toon bedrag-details" tot hij/zij
 * de breakdown nodig heeft.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { fmtEuro } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  subtotaalExclBtw: number | null;
  btwBedrag: number | null;
  btwPercentage: number | null;
  totaalInclBtw: number | null;
  verpakkingTotaal?: number;
  /** Som van factuur-regels (intern berekend) — voor mismatch-detectie. */
  berekendTotaal: number;
}

export function FactuurBedragDetails({
  subtotaalExclBtw,
  btwBedrag,
  btwPercentage,
  totaalInclBtw,
  verpakkingTotaal,
  berekendTotaal,
}: Props) {
  const [open, setOpen] = useState(false);

  // Geen BTW-data → niets tonen.
  const hasData =
    subtotaalExclBtw != null || btwBedrag != null || totaalInclBtw != null;
  if (!hasData) return null;

  const mismatch =
    totaalInclBtw != null &&
    Math.abs(berekendTotaal - totaalInclBtw) >= 0.5 &&
    Math.abs(berekendTotaal - totaalInclBtw) / Math.max(1, totaalInclBtw) >= 0.01;

  return (
    <div className="rounded-xl border border-border/50 bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        aria-expanded={open}
      >
        <span>Bedrag-details</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <dl className="px-4 pb-3 pt-1 space-y-1.5 text-sm">
          {subtotaalExclBtw != null && (
            <div className="flex items-baseline justify-between">
              <dt className="text-muted-foreground">Subtotaal (excl. btw)</dt>
              <dd className="tabular-nums">{fmtEuro(subtotaalExclBtw)}</dd>
            </div>
          )}
          {btwBedrag != null && (
            <div className="flex items-baseline justify-between">
              <dt className="text-muted-foreground">
                BTW{btwPercentage != null ? ` (${btwPercentage}%)` : ""}
              </dt>
              <dd className="tabular-nums">{fmtEuro(btwBedrag)}</dd>
            </div>
          )}
          {verpakkingTotaal != null && verpakkingTotaal > 0 && (
            <div className="flex items-baseline justify-between">
              <dt className="text-muted-foreground">Verpakking & toeslagen</dt>
              <dd className="tabular-nums">{fmtEuro(verpakkingTotaal)}</dd>
            </div>
          )}
          {totaalInclBtw != null && (
            <div className="flex items-baseline justify-between pt-1.5 mt-1.5 border-t border-border/40 font-semibold">
              <dt>Totaal (incl. btw)</dt>
              <dd className="tabular-nums">{fmtEuro(totaalInclBtw)}</dd>
            </div>
          )}
          {mismatch && (
            <p className="pt-2 text-xs text-warning">
              Som regels ({fmtEuro(berekendTotaal)}) wijkt af van
              factuur-totaal ({fmtEuro(totaalInclBtw!)}).
            </p>
          )}
        </dl>
      )}
    </div>
  );
}
