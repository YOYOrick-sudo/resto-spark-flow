/**
 * IngredientMatchBadge — Per-regel matching widget (D.6b R4b-1)
 *
 * States:
 *   - Skipped (R4b-1)              → grijs "Overgeslagen"
 *   - High (>0.85, matched)         → groen "Auto-gematcht" + Wijzig
 *   - Manual                        → groen "Handmatig" + Wijzig
 *   - Medium (0.60–0.85, matched)   → blauw "AI suggestie" + Bevestig / Andere
 *   - Low (<0.60) of unmatched      → oranje/rood + verplichte picker
 *
 * R4b-1: "Nieuw ingrediënt" opent INLINE form i.p.v. modal.
 * NewIngredientPrefill blijft geëxporteerd voor backwards compat
 * (NieuwIngredientFromFactuurModal — deprecated).
 */
import { useState } from "react";
import { Check, AlertCircle, Sparkles, Plus, Loader2, X, SkipForward } from "lucide-react";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { useFuzzyMatchIngredient } from "@/hooks/useFuzzyMatchIngredient";
import { useFactuurMutations } from "@/hooks/useFactuurMutations";
import { NieuwIngredientInlineForm } from "./NieuwIngredientInlineForm";
import type { FactuurRegel } from "@/hooks/useFactuurDetail";

interface Props {
  regel: FactuurRegel;
  leverancierId: string | null;
  leverancierNaam?: string | null;
}

export interface NewIngredientPrefill {
  naam: string;
  eenheid: string;
  /** R3.5 — Prijs per basiseenheid (afgeleid). NIET prijs per verpakking. */
  kostprijs?: number;
  aliasNaam: string;
  artikelnummer?: string | null;
  categorie?: string;
  // R3.5 — leveringsinfo voor modal-card
  verpakkingHoeveelheid?: number | null;
  verpakkingEenheid?: string | null;
  prijsPerVerpakking?: number | null;
  prijsPerBasiseenheid?: number | null;
  verpakkingRaw?: string | null;
}

export function IngredientMatchBadge({ regel, leverancierId, leverancierNaam }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [inlineFormOpen, setInlineFormOpen] = useState(false);
  const [successNaam, setSuccessNaam] = useState<string | null>(null);
  const { confirmMatch } = useFactuurMutations();

  const conf = regel.match_confidence ?? 0;
  const isManual = regel.match_status === "manual";
  const isMatched = regel.match_status === "matched";
  const isSkipped = regel.match_status === "skipped";
  const hasIngredient = !!regel.ingredient_id && !!regel.ingredient_naam;

  const prefill: NewIngredientPrefill = {
    naam: regel.ai_suggested_naam ?? regel.ai_raw_naam ?? regel.product_naam_herkend,
    eenheid: regel.ai_suggested_eenheid ?? "stuk",
    kostprijs: regel.prijs_per_basiseenheid ?? regel.prijs_per_eenheid ?? undefined,
    aliasNaam: regel.product_naam_herkend,
    artikelnummer: regel.ai_raw_artikelnummer,
    categorie: regel.ai_category_hint ?? undefined,
    verpakkingHoeveelheid: regel.verpakking_hoeveelheid,
    verpakkingEenheid: regel.verpakking_eenheid,
    prijsPerVerpakking: regel.prijs_per_eenheid,
    prijsPerBasiseenheid: regel.prijs_per_basiseenheid,
    verpakkingRaw: regel.ai_raw_verpakking_tekst,
  };

  // Helper — render inline form onder welke badge dan ook
  const inlineFormBlock = inlineFormOpen ? (
    <NieuwIngredientInlineForm
      regelId={regel.id}
      prefill={prefill}
      leverancierId={leverancierId}
      leverancierNaam={leverancierNaam}
      onClose={() => setInlineFormOpen(false)}
      onSuccess={(naam) => {
        setSuccessNaam(naam);
        setInlineFormOpen(false);
      }}
    />
  ) : null;

  const successBanner = successNaam ? (
    <NestoBadge variant="success" size="sm">
      <Check className="h-3 w-3" />
      Aangemaakt: {successNaam}
    </NestoBadge>
  ) : null;

  // STATE 0 — Skipped (R4b-1)
  if (isSkipped) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <NestoBadge variant="default" size="sm">
            <SkipForward className="h-3 w-3" />
            Overgeslagen
          </NestoBadge>
        </div>
      </div>
    );
  }

  // STATE 1 — Manual OR high-confidence matched (>0.85)
  if (hasIngredient && (isManual || (isMatched && conf > 0.85))) {
    return (
      <div className="relative space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <NestoBadge variant="success" size="sm">
            <Check className="h-3 w-3" />
            {isManual ? "Handmatig" : "Auto-gematcht"}: {regel.ingredient_naam}
          </NestoBadge>
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Wijzig
          </button>
        </div>
        {pickerOpen && (
          <Picker
            regel={regel}
            leverancierId={leverancierId}
            onClose={() => setPickerOpen(false)}
            onRequestInlineForm={() => {
              setPickerOpen(false);
              setInlineFormOpen(true);
            }}
            floating
          />
        )}
        {successBanner}
        {inlineFormBlock}
      </div>
    );
  }

  // STATE 2 — Medium confidence AI suggestie (0.60–0.85)
  if (hasIngredient && isMatched && conf >= 0.6 && conf <= 0.85) {
    return (
      <div className="relative space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <NestoBadge variant="primary" size="sm">
            <Sparkles className="h-3 w-3" />
            AI suggestie: {regel.ingredient_naam} — {Math.round(conf * 100)}%
          </NestoBadge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <NestoButton
            variant="primary"
            size="sm"
            isLoading={confirmMatch.isPending}
            onClick={() =>
              confirmMatch.mutate({
                regelId: regel.id,
                ingredientId: regel.ingredient_id!,
                aliasNaam: regel.product_naam_herkend,
                leverancierId,
                artikelnummer: regel.ai_raw_artikelnummer,
              })
            }
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Bevestig
          </NestoButton>
          <NestoButton variant="ghost" size="sm" onClick={() => setPickerOpen((v) => !v)}>
            Andere kiezen
          </NestoButton>
        </div>
        {pickerOpen && (
          <Picker
            regel={regel}
            leverancierId={leverancierId}
            onClose={() => setPickerOpen(false)}
            onRequestInlineForm={() => {
              setPickerOpen(false);
              setInlineFormOpen(true);
            }}
            floating
          />
        )}
        {successBanner}
        {inlineFormBlock}
      </div>
    );
  }

  // STATE 3 — Low confidence (<0.60) OR unmatched/no ingredient → picker embedded
  return (
    <div className="space-y-1.5">
      <NestoBadge variant={conf > 0 ? "warning" : "error"} size="sm">
        <AlertCircle className="h-3 w-3" />
        {conf > 0
          ? `Onzekere match (${Math.round(conf * 100)}%)`
          : "Geen match gevonden"}
      </NestoBadge>
      <Picker
        regel={regel}
        leverancierId={leverancierId}
        onRequestInlineForm={() => setInlineFormOpen(true)}
        embedded
      />
      {successBanner}
      {inlineFormBlock}
    </div>
  );
}

// ============================================================
// Picker (suggesties + nieuw)
// ============================================================
interface PickerProps {
  regel: FactuurRegel;
  leverancierId: string | null;
  onClose?: () => void;
  onRequestInlineForm: () => void;
  embedded?: boolean;
  floating?: boolean;
}

function Picker({
  regel,
  leverancierId,
  onClose,
  onRequestInlineForm,
  embedded,
  floating,
}: PickerProps) {
  const { data: suggestiesRaw = [], isLoading } = useFuzzyMatchIngredient(
    regel.product_naam_herkend
  );
  const suggesties = suggestiesRaw.filter((s) => s.similarity >= 0.6);
  const { linkIngredientAlias } = useFactuurMutations();

  const handlePick = (id: string) => {
    linkIngredientAlias.mutate(
      {
        regelId: regel.id,
        ingredientId: id,
        aliasNaam: regel.product_naam_herkend,
        leverancierId,
        artikelnummer: regel.ai_raw_artikelnummer,
      },
      { onSuccess: () => onClose?.() }
    );
  };

  const content = (
    <div className="space-y-1.5">
      {floating && (
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Suggesties
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Sluiten"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {isLoading && (
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Zoeken...
        </div>
      )}
      {!isLoading && suggesties.length === 0 && (
        <p className="text-[11px] text-muted-foreground px-3 py-2">
          Geen vergelijkbare ingrediënten gevonden.
        </p>
      )}
      {suggesties.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => handlePick(s.id)}
          className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 rounded-control bg-card hover:bg-muted/50 border border-border/30 min-h-[40px] transition-colors"
        >
          <span className="text-xs truncate">
            {s.naam}{" "}
            <span className="text-muted-foreground">({s.eenheid})</span>
          </span>
          <NestoBadge variant="default" size="sm">
            {Math.round(s.similarity * 100)}%
          </NestoBadge>
        </button>
      ))}
      <button
        type="button"
        onClick={onRequestInlineForm}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-control border border-dashed border-border hover:border-primary hover:bg-primary/5 text-xs font-medium text-primary min-h-[40px] transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Nieuw ingrediënt aanmaken
      </button>
    </div>
  );

  if (floating) {
    return (
      <div className="absolute z-30 left-0 top-full mt-1.5 w-72 bg-popover border border-border rounded-xl shadow-lg p-2.5">
        {content}
      </div>
    );
  }
  return embedded ? <div className="pt-1">{content}</div> : content;
}
