// Shared helpers voor voorraad-impact preview.
// Gebruikt door LineFactorPanel (inline) en LineRow header (rechts-bovenaan).

import type { LineFactorContext } from "@/hooks/useGoodsReceiptDetail";

export interface PreviewValue {
  value: number;
  unit: string;
}

function previewWithFactor(
  factor: number,
  eenheid: string,
  aantal: number,
  ctx: LineFactorContext,
): PreviewValue | null {
  const u = eenheid.toLowerCase();
  const total = factor * aantal;
  if (u === "stuk" || u === "stuks" || u === "st") return { value: total, unit: "stuks" };
  if (u === "g")
    return ctx.ingredient_base_unit === "kg"
      ? { value: +(total / 1000).toFixed(3), unit: "kg" }
      : { value: total, unit: "g" };
  if (u === "kg")
    return ctx.ingredient_base_unit === "g"
      ? { value: total * 1000, unit: "g" }
      : { value: total, unit: "kg" };
  if (u === "ml")
    return ctx.ingredient_base_unit === "l"
      ? { value: +(total / 1000).toFixed(3), unit: "l" }
      : { value: total, unit: "ml" };
  if (u === "l")
    return ctx.ingredient_base_unit === "ml"
      ? { value: total * 1000, unit: "ml" }
      : { value: total, unit: "l" };
  return { value: total, unit: u };
}

export function computeDeltaPreview(
  ctx: LineFactorContext,
  state: { action: { kind: "none" | "accept_ai" | "manual"; hoeveelheid?: number; eenheid?: string }; werkelijk_gewicht_g: number | null },
  aantal: number,
): PreviewValue | null {
  if (ctx.is_weighted) {
    if (state.werkelijk_gewicht_g == null || state.werkelijk_gewicht_g <= 0) return null;
    const totalG = state.werkelijk_gewicht_g * aantal;
    if (ctx.ingredient_base_unit === "g") return { value: totalG, unit: "g" };
    if (ctx.ingredient_base_unit === "kg")
      return { value: +(totalG / 1000).toFixed(3), unit: "kg" };
    return { value: totalG, unit: "g" };
  }
  if (state.action.kind === "manual" && state.action.hoeveelheid && state.action.eenheid) {
    return previewWithFactor(state.action.hoeveelheid, state.action.eenheid, aantal, ctx);
  }
  // Loop 4c: bij MANUAL_REQUIRED zonder chef-input is er geen betrouwbare
  // preview — toon niets (chef moet eerst bevestigen).
  if (ctx.mode === "MANUAL_REQUIRED") return null;
  const f = ctx.la_factor ?? ctx.ai_factor;
  const u = ctx.la_eenheid ?? ctx.ai_eenheid;
  if (!f || !u) return null;
  return previewWithFactor(f, u, aantal, ctx);
}

export function formatPreview(p: PreviewValue | null, withPlus = true): string {
  if (!p) return "—";
  const v =
    Number.isInteger(p.value) ? String(p.value) : p.value.toFixed(p.value < 10 ? 2 : 1);
  return `${withPlus ? "+" : ""}${v} ${p.unit}`;
}

/** Raw breakdown voor tooltip: "2 pak × 100 g" */
export function formatRawBreakdown(
  ctx: LineFactorContext,
  aantal: number,
): string | null {
  const f = ctx.la_factor ?? ctx.ai_factor;
  const u = ctx.la_eenheid ?? ctx.ai_eenheid;
  if (!f || !u) return null;
  const label = ctx.verpakking_label || "verpakking";
  const fStr = Number.isInteger(f) ? String(f) : String(f);
  return `${aantal} ${label} × ${fStr} ${u}`;
}
