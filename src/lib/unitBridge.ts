/**
 * unitBridge — NULL-veilige eenheid-conversie voor de display-laag.
 *
 * Spiegelt de SQL-functie public.convert_qty(qty, from, to, wpp, density),
 * maar gooit NOOIT bij ontbrekende brug-data. In plaats daarvan geeft het
 * { value: qty, unit: fromUnit, bridged: false } terug, zodat de UI veilig
 * de bron-eenheid kan tonen zonder crash.
 *
 * Gebruik dit voor display/conflict-checks. RPC's (boekingen) blijven
 * convert_qty / to_base_unit aanroepen — daar is een harde error gewenst
 * omdat een verkeerde boeking erger is dan een gemiste boeking.
 */

export type BridgeBase = "g" | "ml" | "st";

export interface IngredientMeta {
  weight_per_piece_g?: number | null;
  density_g_per_ml?: number | null;
}

export interface BridgeResult {
  value: number;
  unit: string;
  /** True als de conversie succesvol via een echte brug is gegaan. False = passthrough. */
  bridged: boolean;
  /** Bij faal: waarom we niet konden bridgen (intern, niet voor UI-kok). */
  reason?: string;
}

// Unit → [base, factor naar base]
const TO_BASE: Record<string, [BridgeBase, number]> = {
  mg: ["g", 0.001],
  g: ["g", 1],
  gr: ["g", 1],
  gram: ["g", 1],
  kg: ["g", 1000],
  kilo: ["g", 1000],
  ml: ["ml", 1],
  cl: ["ml", 10],
  dl: ["ml", 100],
  l: ["ml", 1000],
  ltr: ["ml", 1000],
  liter: ["ml", 1000],
  st: ["st", 1],
  stuk: ["st", 1],
  stuks: ["st", 1],
  bos: ["st", 1],
  bundel: ["st", 1],
};

export function normalizeUnit(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase().replace(/\.$/, "");
}

export function isKnownUnit(raw: string | null | undefined): boolean {
  return normalizeUnit(raw) in TO_BASE;
}

function lookup(unit: string): [BridgeBase, number] | null {
  const n = normalizeUnit(unit);
  return TO_BASE[n] ?? null;
}

/**
 * Bridge qty van fromUnit naar toUnit, NULL-veilig.
 * Bij ontbrekende meta of onbekende units: passthrough (bridged=false).
 */
export function bridgeUnit(
  qty: number,
  fromUnit: string | null | undefined,
  toUnit: string | null | undefined,
  meta: IngredientMeta = {},
): BridgeResult {
  if (qty == null || Number.isNaN(qty)) {
    return { value: 0, unit: normalizeUnit(fromUnit) || "", bridged: false, reason: "no-qty" };
  }
  const fromEntry = lookup(fromUnit ?? "");
  const toEntry = lookup(toUnit ?? "");
  const fromN = normalizeUnit(fromUnit);
  const toN = normalizeUnit(toUnit);

  if (!fromEntry || !toEntry) {
    return { value: qty, unit: fromN || toN || "", bridged: false, reason: "unknown-unit" };
  }
  const [fromBase, fromFactor] = fromEntry;
  const [toBase, toFactor] = toEntry;

  // Trivial: zelfde base → puur factor-deling
  if (fromBase === toBase) {
    const value = (qty * fromFactor) / toFactor;
    return { value: round4(value), unit: toN, bridged: true };
  }

  // Cross-base via meta
  const valueInFromBase = qty * fromFactor;
  const valueInToBase = crossBase(valueInFromBase, fromBase, toBase, meta);
  if (valueInToBase == null) {
    return { value: qty, unit: fromN, bridged: false, reason: "missing-bridge-data" };
  }
  return { value: round4(valueInToBase / toFactor), unit: toN, bridged: true };
}

function crossBase(
  value: number,
  from: BridgeBase,
  to: BridgeBase,
  meta: IngredientMeta,
): number | null {
  const density = meta.density_g_per_ml ?? null;
  const wpp = meta.weight_per_piece_g ?? null;

  if (from === to) return value;

  if (from === "g" && to === "ml") {
    if (!density || density <= 0) return null;
    return value / density;
  }
  if (from === "ml" && to === "g") {
    if (!density || density <= 0) return null;
    return value * density;
  }
  if (from === "g" && to === "st") {
    if (!wpp || wpp <= 0) return null;
    return value / wpp;
  }
  if (from === "st" && to === "g") {
    if (!wpp || wpp <= 0) return null;
    return value * wpp;
  }
  // Chained via gram
  if (from === "ml" && to === "st") {
    const g = crossBase(value, "ml", "g", meta);
    if (g == null) return null;
    return crossBase(g, "g", "st", meta);
  }
  if (from === "st" && to === "ml") {
    const g = crossBase(value, "st", "g", meta);
    if (g == null) return null;
    return crossBase(g, "g", "ml", meta);
  }
  return null;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Vergelijk twee (factor, unit) paren in dezelfde basis. NULL-veilig.
 * Returnt true alleen als beide naar dezelfde base bridgen EN gelijk zijn
 * binnen tolerantie. Bij faal van bridging: false (geen valse match).
 */
export function factorsEquivalent(
  aQty: number,
  aUnit: string,
  bQty: number,
  bUnit: string,
  meta: IngredientMeta,
  tolerancePct = 0.02,
): boolean {
  const aBase = lookup(aUnit);
  if (!aBase) return false;
  const aInBBase = bridgeUnit(aQty, aUnit, bUnit, meta);
  if (!aInBBase.bridged) return false;
  const diff = Math.abs(aInBBase.value - bQty);
  const scale = Math.max(Math.abs(bQty), Math.abs(aInBBase.value), 1e-6);
  return diff / scale <= tolerancePct;
}
