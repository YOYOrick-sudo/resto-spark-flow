// Sprint A.3: Yield-historie panel (NestoPanel, 460px)
// Toont volledige bitemporal audit-trail per methode
import * as React from "react";
import { NestoPanel } from "@/components/polar/NestoPanel";
import { YieldSourcePill } from "./YieldSourcePill";
import { useYieldHistory, type YieldHistoryRow } from "@/hooks/useYield";
import { Loader2 } from "lucide-react";

interface YieldHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  methodeId: string;
  methodeLabel: string;
}

const dtFmt = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const dtFmtFull = new Intl.DateTimeFormat("nl-NL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// Parse "[2024-01-01,)" of "[2024-01-01,2024-06-01)" tot { lower, upper }
function parseRange(range: string): { lower: Date | null; upper: Date | null } {
  const m = range.match(/^[\[(]([^,]*),([^)\]]*)[)\]]$/);
  if (!m) return { lower: null, upper: null };
  const parseOne = (s: string): Date | null => {
    const trimmed = s.trim().replace(/^"|"$/g, "");
    if (!trimmed) return null;
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  };
  return { lower: parseOne(m[1]), upper: parseOne(m[2]) };
}

function formatPeriod(range: string, openLabel: string): string {
  const { lower, upper } = parseRange(range);
  const from = lower ? dtFmt.format(lower) : "altijd";
  const to = upper ? dtFmt.format(upper) : openLabel;
  return `${from} → ${to}`;
}

export function YieldHistoryPanel({
  open,
  onClose,
  methodeId,
  methodeLabel,
}: YieldHistoryPanelProps) {
  const { data: rows, isLoading } = useYieldHistory(methodeId, open);

  return (
    <NestoPanel open={open} onClose={onClose} title="Opbrengst-historie">
      {(titleRef) => (
        <div className="px-5 pt-5 pb-6 space-y-5">
          <div>
            <h2
              ref={titleRef}
              className="text-[18px] font-semibold tracking-tight text-foreground"
            >
              Opbrengst-historie
            </h2>
            <p className="text-[12px] text-muted-foreground mt-1 truncate">
              {methodeLabel}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : !rows || rows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Geen historie gevonden.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {rows.map((row) => (
                <YieldHistoryItem key={row.id} row={row} />
              ))}
            </ul>
          )}
        </div>
      )}
    </NestoPanel>
  );
}

function YieldHistoryItem({ row }: { row: YieldHistoryRow }) {
  const isAssertionOpen = row.assertion_period.endsWith(",)");
  const createdByLabel = row.created_by_name ?? (row.created_by ? "Onbekend" : "Standaardwaarde");

  return (
    <li
      className={
        "rounded-xl border px-4 py-3 " +
        (isAssertionOpen
          ? "border-border bg-card"
          : "border-border/50 bg-muted/30 opacity-75")
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[18px] font-semibold tabular-nums text-foreground">
            {Math.round(row.yield_pct * 100)}%
          </span>
          <YieldSourcePill source={row.source} />
          {!isAssertionOpen && (
            <span className="text-[10px] text-muted-foreground italic">
              ingetrokken
            </span>
          )}
        </div>
      </div>

      <dl className="mt-2 space-y-1 text-[11.5px]">
        <div className="flex gap-2">
          <dt className="text-muted-foreground w-[70px] flex-shrink-0">Geldig:</dt>
          <dd className="text-foreground tabular-nums">
            {formatPeriod(row.effective_period, "nu")}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground w-[70px] flex-shrink-0">Vastgelegd:</dt>
          <dd className="text-foreground tabular-nums">
            {formatPeriod(row.assertion_period, "nu")}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground w-[70px] flex-shrink-0">Door:</dt>
          <dd className="text-foreground">{createdByLabel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground w-[70px] flex-shrink-0">Op:</dt>
          <dd className="text-foreground tabular-nums">
            {dtFmtFull.format(new Date(row.created_at))}
          </dd>
        </div>
        {row.correction_reason && (
          <div className="flex gap-2 pt-1">
            <dt className="text-muted-foreground w-[70px] flex-shrink-0">Reden:</dt>
            <dd className="text-foreground italic">"{row.correction_reason}"</dd>
          </div>
        )}
      </dl>
    </li>
  );
}
