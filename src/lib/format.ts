/**
 * Formatting helpers — euro/percentage display.
 */

/** Standaard euro-formattering: altijd 2 decimalen. */
export function fmtEuro(n: number | null | undefined): string {
  if (n == null) return "—";
  return `€${n.toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Precieze euro-formattering: 4 decimalen voor kleine bedragen (<€0,10),
 * anders 2. Gebruik voor per-eenheid prijzen (€/g, €/ml).
 */
export function fmtEuroPrecise(n: number | null | undefined): string {
  if (n == null) return "—";
  const decimals = Math.abs(n) < 0.1 ? 4 : 2;
  return `€${n.toLocaleString("nl-NL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
