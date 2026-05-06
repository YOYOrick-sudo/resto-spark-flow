// Sprint A.7.3.3 — Aparte page voor methode-historie (vervangt YieldHistoryPanel)
// Generieke route met :type voor toekomstige uitbreiding (kostprijs, wijzigingen, ...)
import { useParams, Link, Navigate } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useRecept } from "@/hooks/useRecept";
import { useYieldHistory, type YieldHistoryRow } from "@/hooks/useYield";
import { YieldSourcePill } from "@/components/recepten/yield/YieldSourcePill";

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

export default function MethodeHistoriePage() {
  const { id, methodeId, type } = useParams<{ id: string; methodeId: string; type: string }>();
  const { data: recept, isLoading: receptLoading } = useRecept(id ?? null);
  const { data: rows, isLoading } = useYieldHistory(methodeId ?? "", !!methodeId);

  // Future-proof: alleen "opbrengst" wordt nu ondersteund
  if (type && type !== "opbrengst") {
    return <Navigate to={`/recepten/${id}`} replace />;
  }

  const methode = recept?.halffabricaat_methodes.find((m) => m.id === methodeId);
  const methodeLabel = methode ? `${recept?.naam} · ${methode.type}` : "";

  return (
    <div className="space-y-6">
      <Link
        to={`/recepten/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] w-fit"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>{recept?.naam ?? "Halffabricaten"}</span>
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Opbrengst-historie
        </h1>
        {methodeLabel && (
          <p className="text-sm text-muted-foreground">{methodeLabel}</p>
        )}
      </header>

      <div className="rounded-2xl border border-border/30 bg-card overflow-hidden">
        {receptLoading || isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !rows || rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Geen historie gevonden.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 text-left w-[110px]">Opbrengst</th>
                <th className="px-4 py-3 text-left w-[120px]">Bron</th>
                <th className="px-4 py-3 text-left">Geldig</th>
                <th className="px-4 py-3 text-left">Vastgelegd</th>
                <th className="px-4 py-3 text-left w-[160px]">Door</th>
                <th className="px-4 py-3 text-left">Reden</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <HistoryTableRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function HistoryTableRow({ row }: { row: YieldHistoryRow }) {
  const isOpen = row.assertion_period.endsWith(",)");
  const createdByLabel = row.created_by_name ?? (row.created_by ? "Onbekend" : "Standaardwaarde");
  return (
    <tr
      className={
        "border-b border-border/30 last:border-0 " +
        (isOpen ? "" : "opacity-60 bg-muted/10")
      }
    >
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tabular-nums text-foreground">
            {Math.round(row.yield_pct * 100)}%
          </span>
          {!isOpen && (
            <span className="text-[10px] italic text-muted-foreground">ingetrokken</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <YieldSourcePill source={row.source} />
      </td>
      <td className="px-4 py-3 align-top tabular-nums text-foreground">
        {formatPeriod(row.effective_period, "nu")}
      </td>
      <td className="px-4 py-3 align-top tabular-nums text-foreground">
        {formatPeriod(row.assertion_period, "nu")}
      </td>
      <td className="px-4 py-3 align-top text-foreground">
        <div>{createdByLabel}</div>
        <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
          {dtFmtFull.format(new Date(row.created_at))}
        </div>
      </td>
      <td className="px-4 py-3 align-top text-foreground">
        {row.correction_reason ? (
          <span className="italic">"{row.correction_reason}"</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
