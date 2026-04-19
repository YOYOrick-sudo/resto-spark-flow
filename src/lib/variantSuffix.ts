/**
 * variantSuffix — R4b-3
 *
 * Bouwt slimme suffix-suggesties voor variant-ingrediënten. Wordt gebruikt
 * wanneer een chef in de duplicate-dialog kiest voor "Maak apart als variant"
 * i.p.v. extra leverancier koppelen.
 *
 * Voorbeelden:
 *   bouwSuffix({ verpakkingHoeveelheid: 50, verpakkingEenheid: "st" })
 *     → "(50 st)"
 *   bouwSuffix({ verpakkingHoeveelheid: 1.25, verpakkingEenheid: "L" })
 *     → "(1,25L)"
 *   bouwSuffix({}) → "(variant 2)"
 */

interface SuffixInput {
  verpakkingHoeveelheid?: number | null;
  verpakkingEenheid?: string | null;
  /** Fallback-volgnummer als verpakking-info ontbreekt (default 2). */
  varianteIndex?: number;
}

const fmtNumber = (n: number): string =>
  n.toLocaleString("nl-NL", { maximumFractionDigits: 3 });

/**
 * Bouw alleen de suffix (zonder spatie er voor). Caller plakt 'em achter de naam.
 */
export function bouwSuffix(input: SuffixInput): string {
  const hh = input.verpakkingHoeveelheid;
  const ee = input.verpakkingEenheid?.trim();

  if (hh != null && hh > 0 && ee) {
    // Stuks → "50 st"; vloeibaar/gewicht zonder spatie → "1,25L"
    const isStuks = /^(st|stuk|stuks|pcs|piece)s?$/i.test(ee);
    const display = isStuks ? `${fmtNumber(hh)} ${ee}` : `${fmtNumber(hh)}${ee}`;
    return `(${display})`;
  }

  return `(variant ${input.varianteIndex ?? 2})`;
}

/**
 * Voegt suffix achter de basisnaam, met enkele spatie. Idempotent: als de naam
 * al een suffix in haakjes heeft, wordt deze NIET dubbel toegevoegd.
 */
export function naamMetSuffix(basisNaam: string, input: SuffixInput): string {
  const trimmed = basisNaam.trim();
  // Heeft al een (xxx) suffix? Dan niet aanraken.
  if (/\s\([^)]+\)\s*$/.test(trimmed)) return trimmed;
  return `${trimmed} ${bouwSuffix(input)}`;
}
