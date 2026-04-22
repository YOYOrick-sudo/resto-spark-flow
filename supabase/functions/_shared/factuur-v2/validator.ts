// supabase/functions/_shared/factuur-v2/validator.ts
// Sprint Factuur-AI V2 — deterministische validatie-laag.
//
// 5 checks:
//   1. Regel-math:        |hvh × prijs - totaal|     > 0.01  → warning
//   2. Som = subtotaal:   |Σregels - subtotaal|       > 0.10  → warning
//   3. BTW-math:          |basis × % - btw|           > 0.01  → warning (per regel)
//   4. Totaal-check:      |subtotaal+ΣBTW - totaal|   > 0.10  → ERROR (status=invalid)
//   5. BTW-nummer regex:  ^NL\d{9}B\d{2}$            → warning bij mismatch
//
// status:
//   errors.length > 0   → "invalid"
//   warnings.length > 0 → "warning"
//   anders              → "valid"

import type { FactuurV2Output } from "./types.ts";

export type ValidationStatus = "valid" | "warning" | "invalid";

export interface ValidationResult {
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
}

const CENT_TOLERANCE = 0.01;
const SUM_TOLERANCE = 0.10;

export function validateFactuur(data: FactuurV2Output): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Regel-math
  for (const [idx, regel] of (data.regels ?? []).entries()) {
    if (
      regel.hoeveelheid_besteld != null &&
      regel.prijs_per_besteld_item != null &&
      regel.prijs_totaal != null
    ) {
      const verwacht = regel.hoeveelheid_besteld * regel.prijs_per_besteld_item;
      if (Math.abs(verwacht - regel.prijs_totaal) > CENT_TOLERANCE) {
        warnings.push(
          `Regel ${idx + 1} (${regel.product_naam}): ${regel.hoeveelheid_besteld} × ${regel.prijs_per_besteld_item} = ${verwacht.toFixed(2)}, factuur zegt ${regel.prijs_totaal}`,
        );
      }
    }
  }

  // 2. Som regels = subtotaal (negeert regels zonder prijs_totaal)
  if (data.subtotaal_excl_btw != null) {
    const somRegels = (data.regels ?? [])
      .filter((r) => !r.is_credit)
      .reduce((sum, r) => sum + (r.prijs_totaal ?? 0), 0);
    const creditAbs = (data.regels ?? [])
      .filter((r) => r.is_credit)
      .reduce((sum, r) => sum + Math.abs(r.prijs_totaal ?? 0), 0);
    const verwachtSubtotaal = somRegels - creditAbs;
    if (Math.abs(verwachtSubtotaal - data.subtotaal_excl_btw) > SUM_TOLERANCE) {
      warnings.push(
        `Som regels (${verwachtSubtotaal.toFixed(2)}) wijkt af van subtotaal (${data.subtotaal_excl_btw})`,
      );
    }
  }

  // 3. BTW-math per tarief
  if (data.btw_regels && data.btw_regels.length > 0) {
    for (const btw of data.btw_regels) {
      const verwachtBtw = btw.basis_bedrag * (btw.percentage / 100);
      if (Math.abs(verwachtBtw - btw.btw_bedrag) > CENT_TOLERANCE) {
        warnings.push(
          `BTW ${btw.percentage}%: ${btw.basis_bedrag} × ${btw.percentage}% = ${verwachtBtw.toFixed(2)}, factuur zegt ${btw.btw_bedrag}`,
        );
      }
    }
  }

  // 4. Totaal = subtotaal + ΣBTW (HARD error)
  if (
    data.subtotaal_excl_btw != null &&
    data.btw_regels &&
    data.btw_regels.length > 0 &&
    data.totaal_incl_btw != null
  ) {
    const somBtw = data.btw_regels.reduce((sum, r) => sum + r.btw_bedrag, 0);
    const verwachtTotaal = data.subtotaal_excl_btw + somBtw;
    if (Math.abs(verwachtTotaal - data.totaal_incl_btw) > SUM_TOLERANCE) {
      errors.push(
        `Totaal (${data.totaal_incl_btw}) klopt niet met subtotaal + BTW (${verwachtTotaal.toFixed(2)})`,
      );
    }
  }

  // 5. BTW-nummer regex
  if (data.leverancier_btw_nummer) {
    if (!/^NL\d{9}B\d{2}$/.test(data.leverancier_btw_nummer)) {
      warnings.push(`BTW-nummer format onjuist: ${data.leverancier_btw_nummer}`);
    }
  }

  let status: ValidationStatus;
  if (errors.length > 0) status = "invalid";
  else if (warnings.length > 0) status = "warning";
  else status = "valid";

  return { status, errors, warnings };
}
