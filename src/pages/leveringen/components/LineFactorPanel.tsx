// Inline factor-panel per regel (Loop 4C): rustige presentatie.
// - CONFIRMED + AI_SUGGESTED → 1-regel compacte status, geen "Klopt"-knop
//   (impliciete bulk-bevestig via "Bevestig levering")
// - MANUAL_REQUIRED → inline form, vraag-richting altijd "1 [verpakking] = X eenheid"
// - Variabel gewicht → aparte strip bij is_weighted
// Geen jargon, geen verkeerslicht-emoji's, geen Sparkles-badges.

import * as React from "react";
import { Check, Pencil, Scale, AlertCircle, X } from "lucide-react";
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
import { computeDeltaPreview, formatPreview } from "@/pages/leveringen/utils/factorPreview";

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
  { value: "stuk", label: "stuk" },
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
  /** True als regel akkoord/accepted is — anders factor irrelevant */
  isStockMutation: boolean;
}

function previewWithFactor(
  factor: number,
  eenheid: string,
  aantal: number,
  ctx: LineFactorContext,
): { value: number; unit: string } | null {
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

function computeDeltaPreview(
  ctx: LineFactorContext,
  state: LinePackagingState,
  aantal: number,
): { value: number; unit: string } | null {
  if (ctx.is_weighted) {
    if (state.werkelijk_gewicht_g == null || state.werkelijk_gewicht_g <= 0) return null;
    const totalG = state.werkelijk_gewicht_g * aantal;
    if (ctx.ingredient_base_unit === "g") return { value: totalG, unit: "g" };
    if (ctx.ingredient_base_unit === "kg")
      return { value: +(totalG / 1000).toFixed(3), unit: "kg" };
    return { value: totalG, unit: "g" };
  }
  if (state.action.kind === "manual") {
    return previewWithFactor(state.action.hoeveelheid, state.action.eenheid, aantal, ctx);
  }
  const f = ctx.la_factor ?? ctx.ai_factor;
  const u = ctx.la_eenheid ?? ctx.ai_eenheid;
  if (!f || !u) return null;
  return previewWithFactor(f, u, aantal, ctx);
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
  isStockMutation,
}: Props) {
  const verpakkingLabel = ctx.verpakking_label;
  const [editingFactor, setEditingFactor] = React.useState(false);
  const [draftAmount, setDraftAmount] = React.useState<string>(
    ctx.display_factor != null ? String(ctx.display_factor) : "",
  );
  const [draftUnit, setDraftUnit] = React.useState<string>(
    ctx.display_eenheid ?? ctx.ingredient_base_unit ?? "stuks",
  );

  // Effectieve modus: manual override → kort tonen als bevestigd
  const effectiveMode =
    state.action.kind === "manual" ? "USER_OVERRIDE" : ctx.mode;

  const preview = computeDeltaPreview(ctx, state, aantalVerpakkingen);

  if (!isStockMutation) return null;
  // Loop 4C-FINISH: emballage-regels worden upstream al apart gerenderd,
  // maar safety-net: nooit factor-panel tonen voor SKIP.
  if (ctx.mode === "SKIP") return null;

  const submitManual = () => {
    const n = Number(draftAmount.replace(",", "."));
    if (!n || n <= 0) return;
    if (!draftUnit) return;
    onChange({ ...state, action: { kind: "manual", hoeveelheid: n, eenheid: draftUnit } });
    setEditingFactor(false);
  };

  // ---------- Variabel gewicht (separate strip) ----------
  const weightStrip = ctx.is_weighted ? (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <Scale className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <span className="text-xs text-muted-foreground">Werkelijk gewicht per {verpakkingLabel}</span>
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

  // ---------- CONFIRMED of AI_SUGGESTED → 1-regel rustige status ----------
  if (effectiveMode === "CONFIRMED" || effectiveMode === "AI_SUGGESTED") {
    return (
      <>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          <Check className="h-3 w-3 text-success" />
          <span className="text-foreground tabular-nums">{formatPreview(preview)}</span>
          <span className="text-muted-foreground/70">op voorraad</span>
          <button
            type="button"
            onClick={() => setEditingFactor(true)}
            className="ml-auto text-xs text-muted-foreground/80 hover:text-foreground inline-flex items-center gap-1"
          >
            <Pencil className="h-3 w-3" />
            Aanpassen
          </button>
        </div>
        {editingFactor && (
          <ManualForm
            verpakkingLabel={verpakkingLabel}
            draftAmount={draftAmount}
            setDraftAmount={setDraftAmount}
            draftUnit={draftUnit}
            setDraftUnit={setDraftUnit}
            onCancel={() => setEditingFactor(false)}
            onSubmit={submitManual}
          />
        )}
        {weightStrip}
      </>
    );
  }

  // ---------- USER_OVERRIDE: chef heeft handmatig ingevuld ----------
  if (effectiveMode === "USER_OVERRIDE" && state.action.kind === "manual") {
    return (
      <>
        <div className="mt-1.5 flex items-center gap-2 text-xs flex-wrap">
          <Check className="h-3 w-3 text-success" />
          <span className="text-foreground tabular-nums">
            1 {verpakkingLabel} = {state.action.hoeveelheid} {state.action.eenheid}
          </span>
          <span className="text-muted-foreground/70">·</span>
          <span className="text-foreground font-medium tabular-nums">{formatPreview(preview)}</span>
          <button
            type="button"
            onClick={() => onChange({ ...state, action: { kind: "none" } })}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            wissen
          </button>
        </div>
        {weightStrip}
      </>
    );
  }

  // ---------- MANUAL_REQUIRED ----------
  return (
    <>
      <ManualForm
        title={ctx.manual_reason ?? `Bevestig 1× wat er in een ${verpakkingLabel} zit`}
        verpakkingLabel={verpakkingLabel}
        draftAmount={draftAmount}
        setDraftAmount={setDraftAmount}
        draftUnit={draftUnit}
        setDraftUnit={setDraftUnit}
        onSubmit={submitManual}
      />
      {weightStrip}
    </>
  );
}

// ---------- Inline manual form ----------
interface ManualFormProps {
  title?: string;
  verpakkingLabel: string;
  draftAmount: string;
  setDraftAmount: (v: string) => void;
  draftUnit: string;
  setDraftUnit: (v: string) => void;
  onCancel?: () => void;
  onSubmit: () => void;
}

function ManualForm({
  title,
  verpakkingLabel,
  draftAmount,
  setDraftAmount,
  draftUnit,
  setDraftUnit,
  onCancel,
  onSubmit,
}: ManualFormProps) {
  return (
    <div className="mt-2 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2.5">
      {title && (
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-3.5 w-3.5 text-warning flex-shrink-0" />
          <span className="text-xs text-foreground">{title}</span>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              annuleer
            </button>
          )}
        </div>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Vraag-richting: ALTIJD '1 [verpakking] = X [eenheid]' */}
        <span className="text-xs text-muted-foreground">1 {verpakkingLabel} =</span>
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
          onClick={onSubmit}
          disabled={!draftAmount || Number(draftAmount.replace(",", ".")) <= 0}
          className={cn("h-8 px-3 text-xs ml-auto")}
        >
          Bevestig
        </NestoButton>
      </div>
    </div>
  );
}
