// Shared helpers voor voorraad-impact preview.
// Gebruikt door LineFactorPanel (inline) en LineRow header (rechts-bovenaan).
//
// Sprint Conversie-discipline: alle eenheid-conversie loopt door bridgeUnit,
// stuksgewicht/dichtheid-aware en NULL-veilig (nooit een crash voor de kok).
// Optie A: op de pakbon-regel is de primaire weergave de eenheid die de
// pakbon meldde (la → ai), NIET de ingredient.base_unit of prefer_piece_display.

import type { LineFactorContext } from "@/hooks/useGoodsReceiptDetail";
import { bridgeUnit, normalizeUnit } from "@/lib/unitBridge";

export interface PreviewValue {
  value: number;
  unit: string;
}

function metaFromCtx(ctx: LineFactorContext) {
  return {
    weight_per_piece_g: ctx.weight_per_piece_g,
    density_g_per_ml: ctx.density_g_per_ml,
  };
}

/**
 * Geef de pakbon-werkelijkheid weer in de eenheid die de pakbon meldde.
 * `factor` is wat er per verpakking zit (bv. 0.25 kg of 1 stuk).
 * `aantal` is hoeveel verpakkingen ontvangen.
 * Resultaat behoudt de pakbon-eenheid — geen heimelijke conversie naar base.
 */
function previewWithFactor(
  factor: number,
  eenheid: string,
  aantal: number,
): PreviewValue | null {
  if (!Number.isFinite(factor) || !Number.isFinite(aantal)) return null;
  const u = normalizeUnit(eenheid);
  const total = factor * aantal;
  // Cosmetische normalisatie: 'stuk' → 'stuks' voor leesbaarheid.
  const displayUnit = u === "stuk" || u === "st" ? "stuks" : u || eenheid;
  return { value: total, unit: displayUnit };
}

export function computeDeltaPreview(
  ctx: LineFactorContext,
  state: {
    action: { kind: "none" | "accept_ai" | "manual"; hoeveelheid?: number; eenheid?: string };
    werkelijk_gewicht_g: number | null;
  },
  aantal: number,
): PreviewValue | null {
  // Weighted items (variabel gewicht): chef vult werkelijk gewicht per verpakking in.
  if (ctx.is_weighted) {
    if (state.werkelijk_gewicht_g == null || state.werkelijk_gewicht_g <= 0) return null;
    const totalG = state.werkelijk_gewicht_g * aantal;
    // Toon in kg voor leesbaarheid (≥1 kg) of g (<1 kg).
    if (totalG >= 1000) return { value: +(totalG / 1000).toFixed(3), unit: "kg" };
    return { value: +totalG.toFixed(0), unit: "g" };
  }

  if (state.action.kind === "manual" && state.action.hoeveelheid && state.action.eenheid) {
    return previewWithFactor(state.action.hoeveelheid, state.action.eenheid, aantal);
  }

  // Pakbon-totaal-leidend (Tak A): toon de op de pakbon vermelde totale ontvangst
  // direct — onafhankelijk van factor × aantal. Vangt los-gewogen producten
  // (Gember/Tauge/Venkel/Spitskool/Peer) en kg-placeholder-LAs (Munt) af.
  if (ctx.pakbon_total_authoritative && ctx.pakbon_total_qty != null && ctx.pakbon_total_unit) {
    return previewWithFactor(Number(ctx.pakbon_total_qty), ctx.pakbon_total_unit, 1);
  }

  // Bij MANUAL_REQUIRED zonder chef-input is er geen betrouwbare preview.
  if (ctx.mode === "MANUAL_REQUIRED") return null;

  const f = ctx.la_factor ?? ctx.ai_factor;
  const u = ctx.la_eenheid ?? ctx.ai_eenheid;
  if (!f || !u) return null;
  return previewWithFactor(Number(f), u, aantal);
}

export function formatPreview(p: PreviewValue | null, withPlus = true): string {
  if (!p) return "—";
  const abs = Math.abs(p.value);
  const v =
    Number.isInteger(p.value)
      ? String(p.value)
      : abs >= 10
      ? p.value.toFixed(1)
      : p.value.toFixed(2);
  // NL-decimaal voor de kok
  const vNl = v.replace(".", ",");
  return `${withPlus ? "+" : ""}${vNl} ${p.unit}`;
}

/** Raw breakdown voor tooltip: "2 doos × 0,25 kg" */
export function formatRawBreakdown(
  ctx: LineFactorContext,
  aantal: number,
): string | null {
  const f = ctx.la_factor ?? ctx.ai_factor;
  const u = ctx.la_eenheid ?? ctx.ai_eenheid;
  if (!f || !u) return null;
  const label = ctx.verpakking_label || "verpakking";
  const fStr = Number.isInteger(Number(f))
    ? String(f)
    : String(f).replace(".", ",");
  const uDisplay = ["stuk", "st"].includes(normalizeUnit(u)) ? "stuks" : u;
  return `${aantal} ${label} × ${fStr} ${uDisplay}`;
}

/**
 * Helper voor LineFactorPanel — bridged factor-label.
 * Geeft de getoonde factor terug in de pakbon-eenheid; bij faal de rauwe waarde.
 * Gebruikt voor "1 [verpakking] = X [eenheid]" weergave.
 */
export function formatFactorLabel(ctx: LineFactorContext): string | null {
  const f = ctx.display_factor;
  const u = ctx.display_eenheid;
  if (f == null || !u) return null;
  // Optie A: toon eenheid zoals-is (pakbon-eenheid). Geen heimelijke conversie.
  const norm = normalizeUnit(u);
  const displayUnit = norm === "stuk" || norm === "st" ? "stuks" : u;
  const fStr = Number.isInteger(Number(f))
    ? String(f)
    : String(f).replace(".", ",");
  return `${fStr} ${displayUnit}`;
}

// Bridge re-export voor consumers die zelf willen converteren.
export { bridgeUnit };
