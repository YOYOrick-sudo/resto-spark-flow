// Inline factor-panel per regel (Loop 4C): rustige presentatie.
// - CONFIRMED + AI_SUGGESTED → 1-regel compacte status, geen "Klopt"-knop
//   (impliciete bulk-bevestig via "Bevestig levering")
// - MANUAL_REQUIRED → inline form, vraag-richting altijd "1 [verpakking] = X eenheid"
// - Variabel gewicht → aparte strip bij is_weighted
// Geen jargon, geen verkeerslicht-emoji's, geen Sparkles-badges.

import * as React from "react";
import { Check, Scale, AlertCircle, X } from "lucide-react";
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
  /** Loop 4c-polish v2: edit-state lifted naar parent zodat card-click 'm kan openen */
  editingFactor?: boolean;
  onEditingFactorChange?: (v: boolean) => void;
}

// Helpers verplaatst naar src/pages/leveringen/utils/factorPreview.ts

export function LineFactorPanel({
  ctx,
  state,
  aantalVerpakkingen,
  onChange,
  isStockMutation,
  editingFactor: editingFactorProp,
  onEditingFactorChange,
}: Props) {
  const verpakkingLabel = ctx.verpakking_label;
  const [editingFactorLocal, setEditingFactorLocal] = React.useState(false);
  const editingFactor = editingFactorProp ?? editingFactorLocal;
  const setEditingFactor = onEditingFactorChange ?? setEditingFactorLocal;
  const [draftAmount, setDraftAmount] = React.useState<string>(
    ctx.prefill_amount != null ? String(ctx.prefill_amount) : "",
  );
  const [draftUnit, setDraftUnit] = React.useState<string>(
    ctx.prefill_unit ?? "",
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
      <div onClick={(e) => e.stopPropagation()}>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          <Check className="h-3 w-3 text-success" />
          <span className="text-foreground tabular-nums">{formatPreview(preview)}</span>
          <span className="text-muted-foreground/70">op voorraad</span>
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
      </div>
    );
  }

  // ---------- USER_OVERRIDE: chef heeft handmatig ingevuld ----------
  if (effectiveMode === "USER_OVERRIDE" && state.action.kind === "manual") {
    return (
      <div onClick={(e) => e.stopPropagation()}>
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
      </div>
    );
  }

  // ---------- MANUAL_REQUIRED ----------
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <ManualForm
        title={ctx.manual_reason ?? `Hoeveel zitten er in 1 ${verpakkingLabel}? Dit onthoud ik voortaan.`}
        verpakkingLabel={verpakkingLabel}
        draftAmount={draftAmount}
        setDraftAmount={setDraftAmount}
        draftUnit={draftUnit}
        setDraftUnit={setDraftUnit}
        onSubmit={submitManual}
      />
      {weightStrip}
    </div>
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
