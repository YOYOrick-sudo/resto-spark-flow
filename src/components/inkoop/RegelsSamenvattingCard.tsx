/**
 * Sprint Factuur Enterprise Pass — RegelsSamenvattingCard
 *
 * VEREENVOUDIGD: alleen header (leverancier, factuurnummer, datum, totaal)
 * + collapsible bedrag-details. Geen "Bevestig X high-confidence matches"
 * knop meer — die actie zit nu impliciet in de "Verwerk factuur" flow.
 */
import { fmtEuro } from "@/lib/format";
import { isVerpakkingRegel, sumRegelTotaal } from "@/lib/factuur-categories";
import { FactuurBedragDetails } from "@/components/inkoop/FactuurBedragDetails";
import type { FactuurRegel } from "@/hooks/useFactuurDetail";

interface Props {
  regels: FactuurRegel[];
  totaal: number;
  leverancierNaam: string | null;
  factuurnummer: string | null;
  factuurdatum: string | null;
  subtotaalExclBtw: number | null;
  btwBedrag: number | null;
  btwPercentage: number | null;
  totaalInclBtw: number | null;
}

export function RegelsSamenvattingCard({
  regels,
  totaal,
  leverancierNaam,
  factuurnummer,
  factuurdatum,
  subtotaalExclBtw,
  btwBedrag,
  btwPercentage,
  totaalInclBtw,
}: Props) {
  const verpakkingRegels = regels.filter(isVerpakkingRegel);
  const verpakkingTotaal = sumRegelTotaal(verpakkingRegels);

  const datumLabel = factuurdatum
    ? new Date(factuurdatum).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold truncate">
            {leverancierNaam ?? "Onbekende leverancier"}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {factuurnummer ? `#${factuurnummer}` : "Geen factuurnummer"}
            {datumLabel ? ` · ${datumLabel}` : ""}
          </p>
        </div>
        <div className="text-base font-semibold tabular-nums shrink-0">
          {fmtEuro(totaal)}
        </div>
      </div>

      <FactuurBedragDetails
        subtotaalExclBtw={subtotaalExclBtw}
        btwBedrag={btwBedrag}
        btwPercentage={btwPercentage}
        totaalInclBtw={totaalInclBtw}
        verpakkingTotaal={verpakkingTotaal}
        berekendTotaal={totaal}
      />
    </div>
  );
}
