// supabase/functions/_shared/factuur-v2/validator.ts
// Sprint Factuur-AI V2 — deterministische validatie-laag.
//
// Sprint Factuur Enterprise Pass — uitgebreid:
//   * per-regel: hoeveelheid × prijs ≠ totaal → markeert regel.validation_error
//   * sum-check met BTW-intelligentie: probeer 9% en 21% match wanneer alleen
//     bruto totaal beschikbaar is. Bij match wordt subtotaal/btw_regels ingevuld.
//   * sumMismatch op output → triggert retry-logica in parse-factuur-v2/index.ts
//
// status:
//   errors.length > 0   → "invalid"
//   warnings.length > 0 → "warning"
//   anders              → "valid"

import type {
  BtwTarief,
  FactuurV2Output,
  FactuurV2Regel,
  SumMismatchInfo,
} from "./types.ts";

export type ValidationStatus = "valid" | "warning" | "invalid";

export interface ValidationResult {
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
  /** Sprint Factuur Enterprise Pass — sum-check info voor retry-trigger. */
  sumMismatch: SumMismatchInfo | null;
}

const CENT_TOLERANCE = 0.01;
const SUM_TOLERANCE = 0.10;
const PER_REGEL_TOLERANCE = 0.02;

const ALLOWED_BTW: BtwTarief[] = [0, 9, 21];

// =====================================================
// Sprint Validator-Slim — per-regel auto-correct + error markering
// =====================================================
//
// SEMANTIEK (Optie B — CHECK 1 first, short-circuit on match):
//   CHECK 1 (origineel) is de canonieke waarheid:
//     hoeveelheid_besteld × prijs_per_besteld_item ≈ prijs_totaal
//   Als CHECK 1 klopt → regel is valid, GEEN verdere checks.
//
//   Alleen als CHECK 1 faalt OF data ontbreekt (q/priceItem null) gaan we
//   door naar fix-checks:
//     CHECK 2: q × verpakking × priceBase ≈ totaal
//              → fix: prijs_per_besteld_item = totaal / q
//     CHECK 3: verpakking × priceItem ≈ totaal
//              → fix: hoeveelheid_besteld = verpakking
//
// Gate (na falen/ontbreken CHECK 1):
//   - 0 fix-matches → validation_error=true
//   - 1 fix-match   → auto-fix toepassen + validation_corrected=true
//   - 2+ fix-matches → validation_ambiguous=true (niet blokkeren)
//
// EDGE CASE: ontbrekende CHECK 1 data (q OR priceItem null) wordt behandeld
// als "kan niet verifiëren via CHECK 1" — direct door naar fix-checks. Een
// regel zonder priceItem kan dus alleen gefixed worden via CHECK 2.
//
// IDEMPOTENT: pure functie per regel — zelfde input geeft zelfde output.
type CheckName = "packaging_base_price" | "packaging_item_qty";

interface CheckMatch {
  name: CheckName;
  fix: Partial<Pick<
    FactuurV2Regel,
    "hoeveelheid_besteld" | "prijs_per_besteld_item"
  >>;
}

function validateAndCorrectLines(regels: FactuurV2Regel[]): void {
  for (const regel of regels) {
    // Reset validator-velden — voorkomt stale waardes bij re-run.
    regel.validation_error = false;
    regel.validation_error_reden = null;
    regel.validation_corrected = false;
    regel.validation_correction_path = null;
    regel.validation_ambiguous = false;

    const totaal = regel.prijs_totaal;
    if (totaal == null || totaal === 0) {
      // Geen referentie-totaal → niets te valideren.
      continue;
    }

    const q = regel.hoeveelheid_besteld;
    const priceItem = regel.prijs_per_besteld_item;
    const priceBase = regel.prijs_per_basiseenheid;
    const verpakking = regel.verpakking_hoeveelheid;
    const absTotaal = Math.abs(totaal);

    // ============================================================
    // CHECK 1 — origineel (canonieke waarheid, short-circuit on match)
    // ============================================================
    const check1Possible = q != null && priceItem != null;
    if (check1Possible) {
      const expected = q! * priceItem!;
      if (Math.abs(expected - absTotaal) <= PER_REGEL_TOLERANCE) {
        // CHECK 1 klopt → regel is valid, klaar.
        continue;
      }
    }

    // ============================================================
    // CHECK 1 faalt OF data ontbreekt → fix-checks evalueren
    // ============================================================
    const matches: CheckMatch[] = [];

    // CHECK 2 — basiseenheid-prijs via verpakking
    if (q != null && q !== 0 && verpakking != null && priceBase != null) {
      const expected = q * verpakking * priceBase;
      if (Math.abs(expected - absTotaal) <= PER_REGEL_TOLERANCE) {
        matches.push({
          name: "packaging_base_price",
          fix: {
            prijs_per_besteld_item: Math.round((absTotaal / q) * 100) / 100,
          },
        });
      }
    }

    // CHECK 3 — verpakking × pak-prijs (vereist priceItem, dus alleen
    // relevant als CHECK 1 wél data had maar faalde).
    if (verpakking != null && priceItem != null) {
      const expected = verpakking * priceItem;
      if (Math.abs(expected - absTotaal) <= PER_REGEL_TOLERANCE) {
        matches.push({
          name: "packaging_item_qty",
          fix: { hoeveelheid_besteld: verpakking },
        });
      }
    }

    if (matches.length === 0) {
      // Geen consistente berekening — markeer als error.
      regel.validation_error = true;
      if (check1Possible) {
        const expected = q! * priceItem!;
        regel.validation_error_reden = `${q} × €${priceItem!.toFixed(2)} = €${
          expected.toFixed(2)
        }, regel zegt €${totaal.toFixed(2)}`;
      } else {
        regel.validation_error_reden =
          `Geen consistente berekening gevonden (totaal=€${totaal.toFixed(2)}, ontbrekende velden)`;
      }
      continue;
    }

    if (matches.length === 1) {
      const only = matches[0];
      Object.assign(regel, only.fix);
      regel.validation_corrected = true;
      regel.validation_correction_path = only.name;
      console.log(
        `[validator] auto-fix path=${only.name} product="${regel.product_naam}" totaal=€${
          totaal.toFixed(2)
        } fix=${JSON.stringify(only.fix)}`,
      );
      continue;
    }

    // 2+ matches: alle alternatieven kloppen → niet blokkeren, wel markeren.
    regel.validation_ambiguous = true;
    console.warn(
      `[validator] ambiguous product="${regel.product_naam}" totaal=€${
        totaal.toFixed(2)
      } matching=${matches.map((m) => m.name).join(",")}`,
    );
  }
}

// =====================================================
// Sum-check met BTW-intelligentie
// =====================================================
function detectSumMismatch(data: FactuurV2Output): SumMismatchInfo | null {
  // Som van valide (niet-validation_error) regels — credits negatief.
  const validRegels = (data.regels ?? []).filter((r) => !r.validation_error);
  const somPositief = validRegels
    .filter((r) => !r.is_credit)
    .reduce((s, r) => s + (r.prijs_totaal ?? 0), 0);
  const somCredits = validRegels
    .filter((r) => r.is_credit)
    .reduce((s, r) => s + Math.abs(r.prijs_totaal ?? 0), 0);
  const somRegels = somPositief - somCredits;

  // === PAD A: expliciete subtotaal_excl_btw vergelijking ===
  if (data.subtotaal_excl_btw != null) {
    const verschil = Math.abs(somRegels - data.subtotaal_excl_btw);
    const pct = data.subtotaal_excl_btw === 0
      ? 0
      : (verschil / Math.abs(data.subtotaal_excl_btw)) * 100;

    if (verschil < 0.50 || pct < 0.5) {
      return null; // OK
    }
    return {
      type: verschil < 2 && pct < 1 ? "klein" : "netto_mismatch",
      som_regels: somRegels,
      vergelijk_basis: data.subtotaal_excl_btw,
      verschil,
      verschil_pct: pct,
    };
  }

  // === PAD B: alleen totaal_incl_btw bekend → BTW-intelligentie ===
  if (data.totaal_incl_btw != null && data.totaal_incl_btw > 0) {
    const mogelijkePct: BtwTarief[] = [9, 21, 0];
    for (const pct of mogelijkePct) {
      const verwachtBruto = somRegels * (1 + pct / 100);
      const verschil = Math.abs(verwachtBruto - data.totaal_incl_btw);
      const relPct = (verschil / Math.abs(data.totaal_incl_btw)) * 100;
      if (verschil < 0.50 || relPct < 0.5) {
        // Match — vul subtotaal/btw_regels in
        data.subtotaal_excl_btw = Number(somRegels.toFixed(2));
        const btwBedrag = Number(
          (data.totaal_incl_btw - somRegels).toFixed(2),
        );
        if (pct > 0 && btwBedrag > 0) {
          data.btw_regels = [
            { percentage: pct, basis_bedrag: somRegels, btw_bedrag: btwBedrag },
          ];
        }
        return {
          type: "klein",
          som_regels: somRegels,
          vergelijk_basis: data.totaal_incl_btw,
          verschil,
          verschil_pct: relPct,
          inferred_btw_percentage: pct,
        };
      }
    }
    // Geen BTW-percentage verklaart het verschil
    const verschil = Math.abs(somRegels - data.totaal_incl_btw);
    const pct = (verschil / Math.abs(data.totaal_incl_btw)) * 100;
    return {
      type: "onverklaarbaar",
      som_regels: somRegels,
      vergelijk_basis: data.totaal_incl_btw,
      verschil,
      verschil_pct: pct,
    };
  }

  return null; // geen referentie om mee te vergelijken
}

// =====================================================
// Hoofdvalidator
// =====================================================
export function validateFactuur(data: FactuurV2Output): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Per-regel auto-correct + error-markering (writes naar data.regels[i])
  validateAndCorrectLines(data.regels ?? []);
  for (const [idx, regel] of (data.regels ?? []).entries()) {
    if (regel.validation_error) {
      warnings.push(
        `Regel ${idx + 1} (${regel.product_naam}): ${
          regel.validation_error_reden ?? "rekenfout"
        }`,
      );
    } else if (regel.validation_ambiguous) {
      warnings.push(
        `Regel ${
          idx + 1
        } (${regel.product_naam}): meerdere berekeningen kloppen — handmatig controleren.`,
      );
    }
  }

  // 2. Sum-check met BTW-intelligentie
  const sumMismatch = detectSumMismatch(data);
  if (sumMismatch && sumMismatch.type !== "klein") {
    warnings.push(
      `Som regels (${sumMismatch.som_regels.toFixed(2)}) wijkt €${
        sumMismatch.verschil.toFixed(2)
      } af van factuur (${sumMismatch.vergelijk_basis.toFixed(2)})`,
    );
  }

  // 3. BTW-percentage whitelist
  if (data.btw_regels && data.btw_regels.length > 0) {
    for (const btw of data.btw_regels) {
      if (!ALLOWED_BTW.includes(btw.percentage)) {
        errors.push(
          `Ongeldig BTW-percentage in btw_regels: ${btw.percentage}. Alleen 0/9/21 toegestaan.`,
        );
      }
    }
  }
  for (const [idx, regel] of (data.regels ?? []).entries()) {
    const pct = regel.btw_percentage;
    if (pct != null && !ALLOWED_BTW.includes(pct)) {
      errors.push(
        `Regel ${
          idx + 1
        } (${regel.product_naam}): ongeldig BTW-percentage ${pct}.`,
      );
    }
  }

  // 4. BTW-math per tarief
  if (data.btw_regels && data.btw_regels.length > 0) {
    for (const btw of data.btw_regels) {
      if (!ALLOWED_BTW.includes(btw.percentage)) continue;
      const verwachtBtw = btw.basis_bedrag * (btw.percentage / 100);
      if (Math.abs(verwachtBtw - btw.btw_bedrag) > CENT_TOLERANCE) {
        warnings.push(
          `BTW ${btw.percentage}%: ${btw.basis_bedrag} × ${btw.percentage}% = ${
            verwachtBtw.toFixed(2)
          }, factuur zegt ${btw.btw_bedrag}`,
        );
      }
    }
  }

  // 5. Totaal = subtotaal + ΣBTW (HARD error)
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
        `Totaal (${data.totaal_incl_btw}) klopt niet met subtotaal + BTW (${
          verwachtTotaal.toFixed(2)
        })`,
      );
    }
  }

  // 6. BTW-nummer regex
  if (data.leverancier_btw_nummer) {
    if (!/^NL\d{9}B\d{2}$/.test(data.leverancier_btw_nummer)) {
      warnings.push(
        `BTW-nummer format onjuist: ${data.leverancier_btw_nummer}`,
      );
    }
  }

  let status: ValidationStatus;
  if (errors.length > 0) status = "invalid";
  else if (warnings.length > 0) status = "warning";
  else status = "valid";

  return { status, errors, warnings, sumMismatch };
}

// =====================================================
// Retry-helper — bepaalt of een 2e AI-poging zinvol is
// =====================================================
//
// IDEMPOTENT: pure functie zonder side-effects. Mag onbeperkt herhaald
// worden — output hangt alleen af van inputs.
export function shouldRetryParse(args: {
  data: FactuurV2Output;
  sumMismatch: SumMismatchInfo | null;
  currentRetries: number;
}): boolean {
  const { data, sumMismatch, currentRetries } = args;

  // Maximaal 1 retry — bespaar kosten
  if (currentRetries >= 1) return false;

  // Geen mismatch → niets te doen
  if (!sumMismatch) return false;
  if (sumMismatch.type === "klein") return false;

  // KOSTEN-BESPARING (Aanscherping 1):
  // - extractie_status='failed' → AI weet zelf dat het mislukt is, retry helpt niet
  if (data.extractie_status === "failed") return false;
  // - extractie_status='partial' ÉN beide totaal-velden missen → hopeloze parse
  if (
    data.extractie_status === "partial" &&
    data.subtotaal_excl_btw == null &&
    data.totaal_incl_btw == null
  ) {
    return false;
  }

  // Mismatch significant: > €2 EN > 1%
  if (sumMismatch.verschil > 2 && sumMismatch.verschil_pct > 1) return true;

  return false;
}
