// Inline factor-panel per regel: CONFIRMED / AI_SUGGESTED / MANUAL_REQUIRED
// + variabel gewicht. Geen popups, alles inline. Gebruik design tokens.

import * as React from "react";
import { Check, Pencil, Scale, Sparkles, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { NestoButton } from "@/components/polar/NestoButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LineFactorContext } from "@/hooks/useGoodsReceiptDetail";

export type FactorAction =
  | { kind: "none" }
  | { kind: "accept_ai" }
  | { kind: "manual"; hoeveelheid: number; eenheid: string };

export interface LinePackagingState {
  /** Door chef gekozen actie */
  action: FactorAction;
  /** Per-verpakking gewicht in gram (alleen bij is_weighted) */
  werkelijk_gewicht_g: number | null;
}

const PACKAGING_UNITS = [
  { value: "stuks", label: "stuks" },
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "l" },
];

interface Props {
  ctx: LineFactorContext;
  state: LinePackagingState;
  /** Aantal verpakkingen (= hoeveelheid_ontvangen of verwacht) */
  aantalVerpakkingen: number;
  onChange: (next: LinePackagingState) => void;
  /** Verpakking-label uit pakbon (bv. "doos") */
  verpakkingNaam: string;
  /** True als regel akkoord/accepted is — anders factor irrelevant */
  isStockMutation: boolean;
}

function computeDeltaPreview(
  ctx: LineFactorContext,
  state: LinePackagingState,
  aantal: number,
): { value: number; unit: string } | null {
  // Variabel gewicht
  if (ctx.is_weighted) {
    if (state.werkelijk_gewicht_g == null || state.werkelijk_gewicht_g <= 0) return null;
    const totalG = state.werkelijk_gewicht_g * aantal;
    if (ctx.ingredient_base_unit === "g") return { value: totalG, unit: "g" };
    if (ctx.ingredient_base_unit === "kg")
      return { value: +(totalG / 1000).toFixed(3), unit: "kg" };
    return { value: totalG, unit: "g" };
  }

  // Manual override wint
  if (state.action.kind === "manual") {
    return previewWithFactor(state.action.hoeveelheid, state.action.eenheid, aantal, ctx);
  }
  // Anders: la → ai
  const f = ctx.la_factor ?? ctx.ai_factor;
  const u = ctx.la_eenheid ?? ctx.ai_eenheid;
  if (!f || !u) return null;
  return previewWithFactor(f, u, aantal, ctx);
}

function previewWithFactor(
  factor: number,
  eenheid: string,
  aantal: number,
  ctx: LineFactorContext,
): { value: number; unit: string } | null {
  const u = eenheid.toLowerCase();
  const total = factor * aantal;
  // Map naar ingredient.base_unit indien bekend
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

function formatPreview(p: { value: number; unit: string } | null): string {
  if (!p) return "—";
  const v =
    Number.isInteger(p.value) ? String(p.value) : p.value.toFixed(p.value < 10 ? 2 : 1);
  return `+${v} ${p.unit}`;
}

export function LineFactorPanel({
  ctx,
  state,
  aantalVerpakkingen,
  onChange,
  verpakkingNaam,
  isStockMutation,
}: Props) {
  const [editingFactor, setEditingFactor] = React.useState(false);
  const [draftAmount, setDraftAmount] = React.useState<string>(
    ctx.display_factor != null ? String(ctx.display_factor) : "",
  );
  const [draftUnit, setDraftUnit] = React.useState<string>(
    ctx.display_eenheid ?? ctx.ingredient_base_unit ?? "stuks",
  );

  // Effectieve modus: manual override → AI_SUGGESTED-look maar met source=user
  const effectiveMode =
    state.action.kind === "manual" ? "USER_OVERRIDE" : ctx.mode;

  const preview = computeDeltaPreview(ctx, state, aantalVerpakkingen);

  if (!isStockMutation) return null;

  const submitManual = () => {
    const n = Number(draftAmount.replace(",", "."));
    if (!n || n <= 0) return;
    if (!draftUnit) return;
    onChange({ ...state, action: { kind: "manual", hoeveelheid: n, eenheid: draftUnit } });
    setEditingFactor(false);
  };

  // ---------- Variabel gewicht (separate strip, kan combineren met factor-modi) ----------
  const weightStrip = ctx.is_weighted ? (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <Scale className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <span className="text-xs text-muted-foreground">Werkelijk gewicht per {verpakkingNaam}</span>
      <div className="flex items-center gap-1.5 ml-auto">
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={state.werkelijk_gewicht_g != null ? (state.werkelijk_gewicht_g / 1000).toFixed(2) : ""}
          onChange={(e) => {
            const v = e.target.value.replace(",", ".");
            const num = Number(v);
            if (!v) {
              onChange({ ...state, werkelijk_gewicht_g: null });
            } else if (!Number.isNaN(num) && num >= 0) {
              onChange({ ...state, werkelijk_gewicht_g: num * 1000 });
            }
          }}
          placeholder="0.00"
          className="h-8 w-20 text-sm text-right tabular-nums"
        />
        <span className="text-xs text-muted-foreground">kg</span>
      </div>
    </div>
  ) : null;

  // ---------- MODUS rendering ----------
  // CONFIRMED: subtiele success-tekst, geen actie
  if (effectiveMode === "CONFIRMED") {
    return (
      <>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Check className="h-3 w-3 text-success" />
          <span>
            <span className="text-foreground font-medium">{formatPreview(preview)}</span>
            <span className="text-muted-foreground/80"> op voorraad</span>
          </span>
        </div>
        {weightStrip}
      </>
    );
  }

  // USER_OVERRIDE: chef heeft handmatig ingevuld
  if (effectiveMode === "USER_OVERRIDE" && state.action.kind === "manual") {
    return (
      <>
        <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-success/10 text-success-foreground px-2 py-0.5 border border-success/30">
            <Check className="h-3 w-3" />
            <span className="font-medium">
              1 {verpakkingNaam} = {state.action.hoeveelheid} {state.action.eenheid}
            </span>
          </span>
          <span className="text-foreground font-medium">→ {formatPreview(preview)}</span>
          <button
            type="button"
            onClick={() => onChange({ ...state, action: { kind: "none" } })}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            wissen
          </button>
        </div>
        {weightStrip}
      </>
    );
  }

  // AI_SUGGESTED
  if (effectiveMode === "AI_SUGGESTED" && !editingFactor) {
    const accepted = state.action.kind === "accept_ai";
    return (
      <>
        <div className="mt-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span className="text-xs text-muted-foreground">
              <span className="text-foreground">
                1 {verpakkingNaam} = {ctx.display_factor} {ctx.display_eenheid}
              </span>
              {preview && (
                <>
                  <span className="text-muted-foreground/70"> · </span>
                  <span className="text-foreground font-medium">{formatPreview(preview)}</span>
                </>
              )}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              {accepted ? (
                <span className="inline-flex items-center gap-1 text-xs text-success">
                  <Check className="h-3 w-3" />
                  bevestigd
                </span>
              ) : (
                <NestoButton
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    onChange({ ...state, action: { kind: "accept_ai" } })
                  }
                  className="h-7 px-2.5 text-xs"
                >
                  Klopt
                </NestoButton>
              )}
              <button
                type="button"
                onClick={() => setEditingFactor(true)}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-1"
              >
                <Pencil className="h-3 w-3" />
                Aanpassen
              </button>
            </div>
          </div>
        </div>
        {weightStrip}
      </>
    );
  }

  // MANUAL_REQUIRED of editing inline → form
  return (
    <>
      <div className="mt-2 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2.5">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-3.5 w-3.5 text-warning flex-shrink-0" />
          <span className="text-xs text-foreground font-medium">
            {ctx.manual_reason ?? "Verpakking-info nodig"}
          </span>
          {editingFactor && (
            <button
              type="button"
              onClick={() => setEditingFactor(false)}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              annuleer
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">1 {verpakkingNaam} =</span>
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            value={draftAmount}
            onChange={(e) => setDraftAmount(e.target.value)}
            placeholder="0"
            className="h-8 w-20 text-sm text-right tabular-nums"
          />
          <Select value={draftUnit} onValueChange={setDraftUnit}>
            <SelectTrigger className="h-8 w-24 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[80]">
              {PACKAGING_UNITS.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <NestoButton
            variant="primary"
            size="sm"
            onClick={submitManual}
            disabled={!draftAmount || Number(draftAmount.replace(",", ".")) <= 0}
            className={cn("h-8 px-3 text-xs ml-auto")}
          >
            Bevestig en onthoud
          </NestoButton>
        </div>
      </div>
      {weightStrip}
    </>
  );
}
