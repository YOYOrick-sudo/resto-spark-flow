// supabase/functions/_shared/factuur-v2/sumCheckMultiBTW.ts
// Sprint Multi-BTW + Emballage — DEEL 3.
//
// Vervangt de simpele "som(regels) ≈ subtotaal" check door een 3-strategische
// validator die multi-BTW en emballage-mix correct afhandelt.
//
// STRATEGIE A — Subtotaal-vergelijking (met emballage-variant)
//   A1: som(alle producten + emballage) ≈ subtotaal_excl_btw
//   A2: som(alleen producten, geen emballage) ≈ subtotaal_excl_btw
//       (Bidfood-pattern: emballage staat soms naast subtotaal genoteerd)
//
// STRATEGIE B — Per-BTW-tarief check
//   Voor elke btw_regel op de factuur:
//     som(regels op pct) × pct% ≈ btw_bedrag voor dat tarief
//   ALLE tarieven moeten kloppen (binnen tolerantie) voor pass.
//
// STRATEGIE C — Uniforme BTW-inferentie
//   som(regels) × (1 + pct/100) ≈ totaal_incl_btw, voor pct ∈ {9, 21}
//   Fallback voor facturen waar alleen totaal_incl_btw bekend is.
//
// Tolerantie: 50ct absoluut OF 1% relatief (de soepelste van de twee wint).
//
// IDEMPOTENT: pure functie zonder side-effects.

import type { FactuurV2BtwRegel, FactuurV2Regel } from "./types.ts";

const TOL_ABS = 0.50;
const TOL_PCT = 1.0;

export type SumCheckStrategy =
  | "A_expliciet_subtotaal"
  | "A_subtotaal_zonder_emballage"
  | "B_per_tarief_klopt"
  | "C_uniforme_9pct_inferentie"
  | "C_uniforme_21pct_inferentie"
  | "geen_referentie"
  | "geen_match";

export interface SumCheckDetails {
  totaal_regels: number;
  totaal_regels_emballage: number;
  totaal_regels_product: number;
  som_per_btw: Record<string, number>;
  verwacht_subtotaal: number | null;
  werkelijk_subtotaal: number | null;
  verschil: number;
  pct_verschil: number;
  /** Aantal verschillende BTW-tarieven gedetecteerd in regels (excl. NULL). */
  n_btw_tarieven: number;
  /** Welke tarieven zijn gedetecteerd. */
  btw_tarieven: number[];
}

export interface SumCheckResult {
  passed: boolean;
  strategy: SumCheckStrategy;
  details: SumCheckDetails;
}

export interface FactuurTotalen {
  subtotaal_excl_btw: number | null;
  btw_bedrag: number | null;
  totaal_incl_btw: number | null;
  btw_regels?: FactuurV2BtwRegel[];
}

/**
 * Helper: tolerantie-check (absoluut OF relatief).
 */
function withinTolerance(actual: number, expected: number): {
  ok: boolean;
  verschil: number;
  pctVerschil: number;
} {
  const verschil = Math.abs(actual - expected);
  const pctVerschil = expected === 0
    ? (verschil === 0 ? 0 : 100)
    : (verschil / Math.abs(expected)) * 100;
  return {
    ok: verschil <= TOL_ABS || pctVerschil <= TOL_PCT,
    verschil,
    pctVerschil,
  };
}

/**
 * Sum-check met 3 strategieën. Returns eerste strategie die slaagt.
 *
 * @param regels Alle factuurregels (na validator + emballage-detectie).
 * @param totalen Factuur-niveau bedragen.
 */
export function sumCheckMultiBTW(
  regels: FactuurV2Regel[],
  totalen: FactuurTotalen,
): SumCheckResult {
  // === Stap 1: segmenteer regels en bereken sommen ===
  // Skip regels met validation_error — die kunnen we niet vertrouwen voor sum.
  const validRegels = regels.filter((r) => !r.validation_error);

  // Credits trekken we af (negatieve bijdrage aan netto-totaal).
  const tekenRegel = (r: FactuurV2Regel): number =>
    r.is_credit ? -1 : 1;

  const productRegels = validRegels.filter((r) => !r.is_emballage);
  const emballageRegels = validRegels.filter((r) => r.is_emballage);

  const somProduct = productRegels.reduce(
    (s, r) => s + tekenRegel(r) * Math.abs(r.prijs_totaal ?? 0),
    0,
  );
  const somEmballage = emballageRegels.reduce(
    (s, r) => s + tekenRegel(r) * Math.abs(r.prijs_totaal ?? 0),
    0,
  );
  const somTotaal = somProduct + somEmballage;

  // Per-BTW-tarief sommatie (gebruikt door Strategie B).
  const somPerBTW: Record<string, number> = {};
  for (const r of validRegels) {
    const pct = r.btw_percentage;
    if (pct == null) continue; // onbekend → niet meetellen in per-tarief check
    const key = String(pct);
    somPerBTW[key] = (somPerBTW[key] ?? 0) +
      tekenRegel(r) * Math.abs(r.prijs_totaal ?? 0);
  }

  const btwTarieven = Object.keys(somPerBTW)
    .map((k) => Number(k))
    .sort((a, b) => a - b);

  const baseDetails: SumCheckDetails = {
    totaal_regels: somTotaal,
    totaal_regels_emballage: somEmballage,
    totaal_regels_product: somProduct,
    som_per_btw: somPerBTW,
    verwacht_subtotaal: totalen.subtotaal_excl_btw,
    werkelijk_subtotaal: somTotaal,
    verschil: 0,
    pct_verschil: 0,
    n_btw_tarieven: btwTarieven.length,
    btw_tarieven: btwTarieven,
  };

  // === Strategie A — expliciet subtotaal_excl_btw ===
  if (totalen.subtotaal_excl_btw != null) {
    // A1: som(alle regels) ≈ subtotaal
    const a1 = withinTolerance(somTotaal, totalen.subtotaal_excl_btw);
    if (a1.ok) {
      return {
        passed: true,
        strategy: "A_expliciet_subtotaal",
        details: {
          ...baseDetails,
          verschil: a1.verschil,
          pct_verschil: a1.pctVerschil,
        },
      };
    }

    // A2: emballage-variant — som(alleen producten) ≈ subtotaal
    // Pas relevant als er minstens 1 emballage-regel is.
    if (emballageRegels.length > 0) {
      const a2 = withinTolerance(somProduct, totalen.subtotaal_excl_btw);
      if (a2.ok) {
        return {
          passed: true,
          strategy: "A_subtotaal_zonder_emballage",
          details: {
            ...baseDetails,
            werkelijk_subtotaal: somProduct,
            verschil: a2.verschil,
            pct_verschil: a2.pctVerschil,
          },
        };
      }
    }
  }

  // === Strategie B — per-BTW-tarief check ===
  // Vereist: factuur heeft btw_regels EN regels hebben btw_percentage gevuld.
  if (
    totalen.btw_regels &&
    totalen.btw_regels.length > 0 &&
    btwTarieven.length > 0
  ) {
    let allemaalKloppen = true;
    let maxVerschil = 0;
    let coveredPercentages = 0;

    for (const btwRegel of totalen.btw_regels) {
      const pct = btwRegel.percentage;
      const somVoorTarief = somPerBTW[String(pct)] ?? 0;

      // Voor 0% kunnen we niet via vermenigvuldiging checken (0×0=0).
      // Alleen check: heeft de factuur 0%-regels die optellen tot ergens?
      // Skip 0% in deze strategie — dekking via Strategie A.
      if (pct === 0) {
        coveredPercentages++;
        continue;
      }

      const verwachtBTW = somVoorTarief * (pct / 100);
      const check = withinTolerance(verwachtBTW, btwRegel.btw_bedrag);
      if (check.verschil > maxVerschil) maxVerschil = check.verschil;
      if (!check.ok) {
        allemaalKloppen = false;
        break;
      }
      coveredPercentages++;
    }

    if (allemaalKloppen && coveredPercentages === totalen.btw_regels.length) {
      return {
        passed: true,
        strategy: "B_per_tarief_klopt",
        details: {
          ...baseDetails,
          verschil: maxVerschil,
          pct_verschil: 0,
        },
      };
    }
  }

  // === Strategie C — uniforme BTW-inferentie ===
  if (totalen.totaal_incl_btw != null && totalen.totaal_incl_btw > 0) {
    for (const pct of [9, 21] as const) {
      const verwachtTotaal = somTotaal * (1 + pct / 100);
      const check = withinTolerance(verwachtTotaal, totalen.totaal_incl_btw);
      if (check.ok) {
        return {
          passed: true,
          strategy: pct === 9
            ? "C_uniforme_9pct_inferentie"
            : "C_uniforme_21pct_inferentie",
          details: {
            ...baseDetails,
            verwacht_subtotaal: somTotaal,
            werkelijk_subtotaal: totalen.totaal_incl_btw / (1 + pct / 100),
            verschil: check.verschil,
            pct_verschil: check.pctVerschil,
          },
        };
      }
    }
  }

  // === Geen strategie slaagt ===
  // Als er geen enkele referentie was: aparte status (niet hetzelfde als mismatch).
  if (
    totalen.subtotaal_excl_btw == null &&
    totalen.totaal_incl_btw == null &&
    (!totalen.btw_regels || totalen.btw_regels.length === 0)
  ) {
    return {
      passed: false,
      strategy: "geen_referentie",
      details: baseDetails,
    };
  }

  // Anders: echte mismatch — fallback verschil tegen subtotaal of totaal.
  let verschil = 0;
  let pctVerschil = 0;
  if (totalen.subtotaal_excl_btw != null) {
    const a = withinTolerance(somTotaal, totalen.subtotaal_excl_btw);
    verschil = a.verschil;
    pctVerschil = a.pctVerschil;
  } else if (totalen.totaal_incl_btw != null) {
    const c = withinTolerance(somTotaal, totalen.totaal_incl_btw);
    verschil = c.verschil;
    pctVerschil = c.pctVerschil;
  }

  return {
    passed: false,
    strategy: "geen_match",
    details: {
      ...baseDetails,
      verschil,
      pct_verschil: pctVerschil,
    },
  };
}
