import { NestoButton } from "@/components/polar";
import { CheckCircle2, Package } from "lucide-react";
import { isVerpakkingRegel, sumRegelTotaal } from "@/lib/factuur-categories";
import type { FactuurRegel } from "@/hooks/useFactuurDetail";

interface Props {
  regels: FactuurRegel[];
  totaal: number;
  highConfRegels: FactuurRegel[];
  onBulkConfirm: () => void;
  isBulkPending: boolean;
  isEditable: boolean;
  onOpenVerpakking?: () => void;
}

export function RegelsSamenvattingCard({
  regels,
  totaal,
  highConfRegels,
  onBulkConfirm,
  isBulkPending,
  isEditable,
  onOpenVerpakking,
}: Props) {
  // Sprint A3: scheid verpakking-regels van échte ingrediënt-regels.
  const verpakkingRegels = regels.filter(isVerpakkingRegel);
  const ingredientRegels = regels.filter((r) => !isVerpakkingRegel(r));

  const totalCount = ingredientRegels.length;
  const matchedCount = ingredientRegels.filter(
    (r) => r.match_status === "matched" || r.match_status === "manual"
  ).length;
  const unmatchedCount = ingredientRegels.filter(
    (r) => r.match_status === "unmatched"
  ).length;

  const verpakkingTotaal = sumRegelTotaal(verpakkingRegels);

  return (
    <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="text-sm">
          <span className="font-semibold">{totalCount} regels</span>
          <span className="text-muted-foreground"> · </span>
          <span className="text-success font-medium">{matchedCount} gematcht</span>
          {unmatchedCount > 0 && (
            <>
              <span className="text-muted-foreground"> · </span>
              <span className="text-warning font-medium">{unmatchedCount} nieuw</span>
            </>
          )}
        </div>
        <div className="text-sm font-semibold tabular-nums">€{totaal.toFixed(2)}</div>
      </div>

      {/* Sprint A3: compacte verpakking-chip — klikbaar → opent modal */}
      {verpakkingRegels.length > 0 && onOpenVerpakking && (
        <button
          type="button"
          onClick={onOpenVerpakking}
          className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-xs font-medium border border-border/60 bg-background text-muted-foreground hover:text-foreground hover:border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Package className="h-3 w-3" />
          {verpakkingRegels.length} verpakking
          <span className="tabular-nums opacity-70">
            · €{verpakkingTotaal.toFixed(2)}
          </span>
        </button>
      )}

      {isEditable && highConfRegels.length > 0 && (
        <NestoButton
          variant="outline"
          size="sm"
          isLoading={isBulkPending}
          onClick={onBulkConfirm}
          className="w-full sm:w-auto"
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-success" />
          Bevestig {highConfRegels.length} high-confidence matches
        </NestoButton>
      )}
    </div>
  );
}
