import { NestoButton } from "@/components/polar";
import { CheckCircle2 } from "lucide-react";
import type { FactuurRegel } from "@/hooks/useFactuurDetail";

interface Props {
  regels: FactuurRegel[];
  totaal: number;
  highConfRegels: FactuurRegel[];
  onBulkConfirm: () => void;
  isBulkPending: boolean;
  isEditable: boolean;
}

export function RegelsSamenvattingCard({
  regels,
  totaal,
  highConfRegels,
  onBulkConfirm,
  isBulkPending,
  isEditable,
}: Props) {
  const totalCount = regels.length;
  const matchedCount = regels.filter(
    (r) => r.match_status === "matched" || r.match_status === "manual"
  ).length;
  const unmatchedCount = regels.filter((r) => r.match_status === "unmatched").length;
  // overig = regex-detectie op product naam
  const OVERIG_REGEX = /bezorg|emballage|retour|statiegeld|toeslag|brandstof|milieu|pallet/i;
  const overigCount = regels.filter((r) =>
    OVERIG_REGEX.test(r.product_naam_herkend)
  ).length;

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
          {overigCount > 0 && (
            <>
              <span className="text-muted-foreground"> · </span>
              <span className="text-muted-foreground">{overigCount} overig</span>
            </>
          )}
        </div>
        <div className="text-sm font-semibold tabular-nums">€{totaal.toFixed(2)}</div>
      </div>

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
