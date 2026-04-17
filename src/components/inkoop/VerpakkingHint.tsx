/**
 * VerpakkingHint — R3.5
 *
 * Toont per factuurregel de verpakking → basiseenheid conversie:
 *   "1 doos × 246 stuk · €64,57/doos → €0,26/stuk"
 *
 * Verbergt zichzelf als er geen verpakking-data is (los geleverd product).
 */
import * as React from "react";
import type { FactuurRegel } from "@/hooks/useFactuurDetail";

interface Props {
  regel: Pick<
    FactuurRegel,
    | "verpakking_hoeveelheid"
    | "verpakking_eenheid"
    | "prijs_per_eenheid"
    | "prijs_per_basiseenheid"
    | "ai_suggested_eenheid"
    | "eenheid"
  >;
}

const fmt = (n: number) =>
  n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

export function VerpakkingHint({ regel }: Props) {
  const hvh = regel.verpakking_hoeveelheid;
  const verpEenh = regel.verpakking_eenheid;
  const prijsVerp = regel.prijs_per_eenheid;
  const prijsBasis = regel.prijs_per_basiseenheid;
  const basisEenh = regel.ai_suggested_eenheid ?? "stuk";

  if (!hvh || !verpEenh || prijsVerp == null || prijsBasis == null) {
    return null;
  }

  return (
    <p className="text-[11px] text-muted-foreground/80 mt-0.5">
      1 {verpEenh} × {hvh} {basisEenh} · €{fmt(prijsVerp)}/{verpEenh} →{" "}
      <span className="text-foreground font-medium">
        €{fmt(prijsBasis)}/{basisEenh}
      </span>
    </p>
  );
}
