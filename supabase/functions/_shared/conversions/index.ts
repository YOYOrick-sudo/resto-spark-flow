// supabase/functions/_shared/conversions/index.ts
// Sprint 2E Loop 3 — Generieke conversie-service voor ingredient-eenheden.
//
// DOEL:
//   Convert qty van willekeurige unit naar willekeurige unit, gebruikmakend
//   van het ingredient z'n base_unit, weight_per_piece_g en density_g_per_ml.
//
// ARCHITECTUUR:
//   - Iedere unit wordt eerst genormaliseerd naar de bijhorende base
//     ('g' | 'ml' | 'st') via een statische factor in TO_BASE.
//   - convert() werkt in 2 stappen:
//       1. toBaseUnit(qty, fromUnit) → number in base_unit van de bron-unit
//       2. crossBaseIfNeeded() → bridge naar base_unit van de doel-unit
//          via density_g_per_ml (g↔ml) en/of weight_per_piece_g (g↔st).
//       3. fromBaseUnit(baseQty, toUnit) → factor terug naar doel-unit.
//   - Decimal.js voorkomt floating-point drift; resultaat wordt
//     afgerond naar 4 decimalen en als plain number teruggegeven.
//
// GENERIEK:
//   Geen hardcoded ingredients. Werkt voor elke leverancier/keuken die
//   het Ingredient-contract aanlevert. Onbekende units → throw.
//
// ERROR-CONTRACT:
//   - UnknownUnitError: unit komt niet voor in TO_BASE (caller normaliseert
//     of valt terug op default).
//   - MissingConversionError: bridge tussen bases vereist een veld dat NULL
//     is (bv. weight_per_piece_g voor g↔st). Caller bepaalt of dit een
//     hard fail of soft fallback wordt (bv. UI-prompt aan chef).

import Decimal from "npm:decimal.js@10.4.3";

export type BaseUnit = "g" | "ml" | "st";
export type Unit = string; // genormaliseerd via normalizeUnit()

export interface Ingredient {
  base_unit: BaseUnit;
  weight_per_piece_g?: number | null;
  density_g_per_ml?: number | null; // default 1.0 als NULL
}

export class UnknownUnitError extends Error {
  constructor(unit: string) {
    super(`Unknown unit: "${unit}"`);
    this.name = "UnknownUnitError";
  }
}

export class MissingConversionError extends Error {
  constructor(reason: string) {
    super(`Missing conversion data: ${reason}`);
    this.name = "MissingConversionError";
  }
}

// =====================================================
// Unit dictionary — NL + EN aliases → [base, factor naar base]
// =====================================================
//
// Voorbeeld: 'kg' → ['g', 1000]  betekent: 1 kg = 1000 g
//            'el' → ['ml', 15]   betekent: 1 eetlepel = 15 ml
//
// 'bos' / 'bundel' / 'teen' = telbare units → mappen op 'st'.
// Spoon-maten gaan naar volume; droge schattingen naar gewicht.

const TO_BASE: Record<string, [BaseUnit, number]> = {
  // weight
  mg: ["g", 0.001],
  g: ["g", 1],
  gr: ["g", 1],
  gram: ["g", 1],
  grammen: ["g", 1],
  kg: ["g", 1000],
  kilo: ["g", 1000],
  kilogram: ["g", 1000],

  // volume
  ml: ["ml", 1],
  milliliter: ["ml", 1],
  cl: ["ml", 10],
  centiliter: ["ml", 10],
  dl: ["ml", 100],
  deciliter: ["ml", 100],
  l: ["ml", 1000],
  ltr: ["ml", 1000],
  liter: ["ml", 1000],

  // spoons & cups (gemiddelden NL)
  el: ["ml", 15],
  eetlepel: ["ml", 15],
  eetlepels: ["ml", 15],
  tl: ["ml", 5],
  theelepel: ["ml", 5],
  theelepels: ["ml", 5],
  kop: ["ml", 240],
  koppen: ["ml", 240],

  // dry estimates
  snufje: ["g", 0.4],
  mespunt: ["g", 0.5],
  scheutje: ["ml", 15],

  // count
  st: ["st", 1],
  stuk: ["st", 1],
  stuks: ["st", 1],
  bos: ["st", 1],
  bossen: ["st", 1],
  bundel: ["st", 1],
  bundels: ["st", 1],
  teen: ["st", 1],
  teentje: ["st", 1],
  teentjes: ["st", 1],
};

// =====================================================
// normalizeUnit — strip diacritics/case, map naar dictionary
// =====================================================

export function normalizeUnit(raw: string): string {
  return raw.trim().toLowerCase().replace(/\.$/, ""); // strip trailing period (bv. "kg.")
}

export function isKnownUnit(raw: string): boolean {
  return normalizeUnit(raw) in TO_BASE;
}

// =====================================================
// Core helpers
// =====================================================

/**
 * Converteer qty in `unit` naar het base_unit dat hoort bij die unit zelf.
 * Bv: toBaseOfUnit(2, 'kg') → { base: 'g', value: 2000 }
 */
function toBaseOfUnit(qty: Decimal, unit: string): { base: BaseUnit; value: Decimal } {
  const norm = normalizeUnit(unit);
  const entry = TO_BASE[norm];
  if (!entry) throw new UnknownUnitError(unit);
  const [base, factor] = entry;
  return { base, value: qty.mul(factor) };
}

/**
 * Bridge tussen verschillende base-units met behulp van ingredient-metadata.
 *   g  ↔ ml : via density_g_per_ml (default 1.0)
 *   g  ↔ st : via weight_per_piece_g (verplicht)
 *   ml ↔ st : chained (ml→g→st of st→g→ml)
 */
function crossBase(
  value: Decimal,
  fromBase: BaseUnit,
  toBase: BaseUnit,
  ing: Ingredient
): Decimal {
  if (fromBase === toBase) return value;

  const density = new Decimal(ing.density_g_per_ml ?? 1);
  const weightPerPiece = ing.weight_per_piece_g != null
    ? new Decimal(ing.weight_per_piece_g)
    : null;

  // Direct
  if (fromBase === "g" && toBase === "ml") {
    if (density.lte(0)) throw new MissingConversionError("density_g_per_ml must be > 0");
    return value.div(density);
  }
  if (fromBase === "ml" && toBase === "g") {
    return value.mul(density);
  }
  if (fromBase === "g" && toBase === "st") {
    if (!weightPerPiece || weightPerPiece.lte(0)) {
      throw new MissingConversionError("weight_per_piece_g required for g↔st conversion");
    }
    return value.div(weightPerPiece);
  }
  if (fromBase === "st" && toBase === "g") {
    if (!weightPerPiece || weightPerPiece.lte(0)) {
      throw new MissingConversionError("weight_per_piece_g required for g↔st conversion");
    }
    return value.mul(weightPerPiece);
  }

  // Chained via gram
  if (fromBase === "ml" && toBase === "st") {
    const grams = value.mul(density);
    return crossBase(grams, "g", "st", ing);
  }
  if (fromBase === "st" && toBase === "ml") {
    const grams = crossBase(value, "st", "g", ing);
    if (density.lte(0)) throw new MissingConversionError("density_g_per_ml must be > 0");
    return grams.div(density);
  }

  throw new MissingConversionError(`Unsupported base bridge ${fromBase}→${toBase}`);
}

/**
 * Vermenigvuldig base-waarde terug naar target-unit.
 */
function fromBaseOfUnit(value: Decimal, targetUnit: string): { base: BaseUnit; value: Decimal } {
  const norm = normalizeUnit(targetUnit);
  const entry = TO_BASE[norm];
  if (!entry) throw new UnknownUnitError(targetUnit);
  const [base, factor] = entry;
  if (factor === 0) throw new MissingConversionError(`Zero factor for unit ${targetUnit}`);
  return { base, value: value.div(factor) };
}

// =====================================================
// Public API
// =====================================================

/**
 * Convert qty van fromUnit → toUnit voor een gegeven ingredient.
 *
 * @throws UnknownUnitError      bij onbekende unit-string
 * @throws MissingConversionError bij ontbrekende weight_per_piece_g (g↔st)
 */
export function convert(
  qty: number,
  fromUnit: string,
  toUnit: string,
  ingredient: Ingredient
): number {
  const q = new Decimal(qty);
  const src = toBaseOfUnit(q, fromUnit);
  const tgt = fromBaseOfUnit(new Decimal(1), toUnit); // we hebben alleen tgt.base nodig
  const bridged = crossBase(src.value, src.base, tgt.base, ingredient);
  // bridged staat nu in tgt.base; deel door factor om naar toUnit te schalen
  const back = fromBaseOfUnit(bridged, toUnit);
  return roundTo(back.value, 4);
}

/**
 * Converteer qty in willekeurige unit naar het base_unit van het ingredient.
 * Handig voor stock-bewegingen die we altijd in base willen opslaan.
 */
export function toBaseUnit(qty: number, unit: string, ingredient: Ingredient): number {
  const q = new Decimal(qty);
  const src = toBaseOfUnit(q, unit);
  const bridged = crossBase(src.value, src.base, ingredient.base_unit, ingredient);
  return roundTo(bridged, 4);
}

/**
 * Converteer qty (in ingredient.base_unit) naar willekeurige doel-unit.
 */
export function fromBaseUnit(qty: number, targetUnit: string, ingredient: Ingredient): number {
  const q = new Decimal(qty);
  const tgt = fromBaseOfUnit(new Decimal(1), targetUnit);
  const bridged = crossBase(q, ingredient.base_unit, tgt.base, ingredient);
  const back = fromBaseOfUnit(bridged, targetUnit);
  return roundTo(back.value, 4);
}

function roundTo(d: Decimal, decimals: number): number {
  return Number(d.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toString());
}
