// Sprint Pakbon Kok-flow (etappe 1+2): UI voor pakbon-regel-match.
// Toont drie states:
//   - gekoppeld (groen) → 1-regel info + "Andere kiezen"-link
//   - needs_confirmation → suggestie-kaart met Ja / Andere / Nieuw
//   - unmatched → "Kies ingrediënt" / "Nieuw aanmaken"
//
// Eén tik = bevestigen. Alias-leerlogica draait achter de schermen (hook).

import * as React from "react";
import { Check, Search, Plus, X } from "lucide-react";
import { NestoButton } from "@/components/polar/NestoButton";
import { Input } from "@/components/ui/input";
import { useIngredientSearch } from "@/hooks/useIngredientSearch";
import {
  usePakbonLineMatch,
  type ConfirmSuggestionArgs,
  type PickOtherArgs,
  type CreateNewArgs,
} from "@/hooks/usePakbonLineMatch";
import type { GoodsReceiptLineWithIngredient } from "@/hooks/useGoodsReceiptDetail";

interface Props {
  line: GoodsReceiptLineWithIngredient;
  receiptId: string;
  leverancierId: string | null;
  locationId: string;
}

export function LineMatchPanel({ line, receiptId, leverancierId, locationId }: Props) {
  const { confirmSuggestion, pickOtherIngredient, createNewIngredient } = usePakbonLineMatch();
  const [mode, setMode] = React.useState<"idle" | "pick" | "create">("idle");
  const [query, setQuery] = React.useState("");
  const { data: candidates = [] } = useIngredientSearch(query);

  const aliasNaam = line.ai_raw_naam || line.product_naam_herkend;
  const artikelnummer = line.ai_raw_artikelnummer ?? null;
  const base: Omit<ConfirmSuggestionArgs, "suggested_ingredient_id"> = {
    line_id: line.id,
    receipt_id: receiptId,
    leverancier_id: leverancierId,
    alias_naam: aliasNaam,
    artikelnummer,
  };

  // ===== State A: gekoppeld =====
  if (line.match_status === "matched" && line.ingredient) {
    return (
      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <Check className="h-3 w-3 text-success" />
        <span className="text-foreground">Gekoppeld aan {line.ingredient.naam}</span>
        <button
          type="button"
          onClick={() => setMode("pick")}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          Andere kiezen
        </button>
        {mode === "pick" && (
          <PickerInline
            query={query}
            setQuery={setQuery}
            candidates={candidates}
            onCancel={() => setMode("idle")}
            onPick={(ingredient_id) => {
              const args: PickOtherArgs = { ...base, ingredient_id };
              pickOtherIngredient.mutate(args, { onSuccess: () => setMode("idle") });
            }}
            disabled={pickOtherIngredient.isPending}
          />
        )}
      </div>
    );
  }

  // ===== State B: needs_confirmation (twijfelzone) =====
  if (line.match_status === "needs_confirmation" && line.suggested_ingredient) {
    return (
      <div className="mt-2 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-foreground">
            Bedoel je: <span className="font-medium">{line.suggested_ingredient.naam}</span>?
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <NestoButton
              variant="primary"
              size="sm"
              className="h-8 px-3 text-xs"
              disabled={confirmSuggestion.isPending}
              onClick={() => {
                const args: ConfirmSuggestionArgs = {
                  ...base,
                  suggested_ingredient_id: line.suggested_ingredient!.id,
                };
                confirmSuggestion.mutate(args);
              }}
            >
              Ja, koppel
            </NestoButton>
            <button
              type="button"
              onClick={() => setMode("pick")}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              Andere
            </button>
            <button
              type="button"
              onClick={() => setMode("create")}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
            >
              Nieuw
            </button>
          </div>
        </div>
        {mode === "pick" && (
          <PickerInline
            query={query}
            setQuery={setQuery}
            candidates={candidates}
            onCancel={() => setMode("idle")}
            onPick={(ingredient_id) => {
              const args: PickOtherArgs = { ...base, ingredient_id };
              pickOtherIngredient.mutate(args, { onSuccess: () => setMode("idle") });
            }}
            disabled={pickOtherIngredient.isPending}
          />
        )}
        {mode === "create" && (
          <CreateInline
            defaultNaam={aliasNaam}
            defaultUnit={line.ai_package_unit ?? "stuk"}
            onCancel={() => setMode("idle")}
            onCreate={(naam, base_unit) => {
              const args: CreateNewArgs = {
                ...base,
                naam,
                base_unit,
                location_id: locationId,
              };
              createNewIngredient.mutate(args, { onSuccess: () => setMode("idle") });
            }}
            disabled={createNewIngredient.isPending}
          />
        )}
      </div>
    );
  }

  // ===== State C: unmatched / nieuw aangemaakt =====
  if (line.status === "emballage_skip") return null;
  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">
          {line.is_nieuw_ingredient ? "Nieuw aangemaakt" : "Niet herkend"}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMode("pick")}
            className="text-xs text-foreground hover:underline px-2 py-1"
          >
            Kies ingrediënt
          </button>
        </div>
      </div>
      {mode === "pick" && (
        <PickerInline
          query={query}
          setQuery={setQuery}
          candidates={candidates}
          onCancel={() => setMode("idle")}
          onPick={(ingredient_id) => {
            const args: PickOtherArgs = { ...base, ingredient_id };
            pickOtherIngredient.mutate(args, { onSuccess: () => setMode("idle") });
          }}
          disabled={pickOtherIngredient.isPending}
        />
      )}
    </div>
  );
}

// ===== Inline picker =====
function PickerInline({
  query,
  setQuery,
  candidates,
  onCancel,
  onPick,
  disabled,
}: {
  query: string;
  setQuery: (v: string) => void;
  candidates: Array<{ id: string; naam: string; eenheid: string | null }>;
  onCancel: () => void;
  onPick: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1.5">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek ingrediënt…"
          className="h-8 text-sm"
        />
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {candidates.length > 0 && (
        <div className="border border-border rounded-md divide-y divide-border bg-background">
          {candidates.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={disabled}
              onClick={() => onPick(c.id)}
              className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted/40 flex items-center justify-between"
            >
              <span className="text-foreground">{c.naam}</span>
              {c.eenheid && <span className="text-muted-foreground">{c.eenheid}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== Inline create =====
function CreateInline({
  defaultNaam,
  defaultUnit,
  onCancel,
  onCreate,
  disabled,
}: {
  defaultNaam: string;
  defaultUnit: string;
  onCancel: () => void;
  onCreate: (naam: string, base_unit: string) => void;
  disabled: boolean;
}) {
  const [naam, setNaam] = React.useState(defaultNaam);
  const [unit, setUnit] = React.useState(defaultUnit);
  return (
    <div className="mt-2 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <Plus className="h-3.5 w-3.5 text-muted-foreground" />
      <Input
        value={naam}
        onChange={(e) => setNaam(e.target.value)}
        placeholder="Naam"
        className="h-8 text-sm flex-1"
      />
      <Input
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        placeholder="eenheid"
        className="h-8 w-20 text-sm"
      />
      <NestoButton
        variant="primary"
        size="sm"
        disabled={!naam.trim() || !unit.trim() || disabled}
        onClick={() => onCreate(naam.trim(), unit.trim())}
        className="h-8 px-3 text-xs"
      >
        Maak aan
      </NestoButton>
      <button
        type="button"
        onClick={onCancel}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
