// Sprint Pakbon Kok-flow (etappe 1+2): mutatie-hook voor match-correcties op
// pakbon-regels. Drie acties:
//   - confirmSuggestion: kok bevestigt de AI-suggestie (1 tik)
//   - pickOtherIngredient: kok kiest een ander bestaand ingrediënt
//   - createNewIngredient: kok maakt een nieuw ingrediënt aan
//
// Alle drie schrijven na de link een alias via record_factuur_correction
// (SECURITY DEFINER, idempotent ON CONFLICT). Hergebruikt de factuur-leerlogica
// — leverancier-specifiek, alias-naam = rauwe pakbon-naam.
//
// Doel: volgende pakbon van dezelfde leverancier matcht via Tier-4 (alias-hit)
// en hoeft niet opnieuw bevestigd te worden.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { nestoToast } from "@/lib/nestoToast";

interface BaseArgs {
  line_id: string;
  receipt_id: string;
  leverancier_id: string | null;
  /** Rauwe pakbon-naam — wordt als alias_naam gebruikt */
  alias_naam: string;
  /** Pakbon-artikelnummer (optioneel) */
  artikelnummer?: string | null;
}

export interface ConfirmSuggestionArgs extends BaseArgs {
  suggested_ingredient_id: string;
}

export interface PickOtherArgs extends BaseArgs {
  ingredient_id: string;
}

export interface CreateNewArgs extends BaseArgs {
  naam: string;
  base_unit: string;
  display_eenheid?: string;
  location_id: string;
  is_variable_weight?: boolean;
}

async function writeAlias(args: BaseArgs, ingredientId: string) {
  if (!args.alias_naam?.trim()) return;
  const { error } = await supabase.rpc("record_factuur_correction", {
    p_ingredient_id: ingredientId,
    p_alias_naam: args.alias_naam.trim(),
    p_leverancier_id: args.leverancier_id ?? undefined,
    p_artikelnummer: args.artikelnummer?.trim() || undefined,
  });
  if (error) {
    // Niet blokkeren — link is al gelegd. Log voor debug.
    console.warn("[pakbon-alias] record_factuur_correction failed:", error);
  }
}

async function linkLineToIngredient(line_id: string, ingredient_id: string) {
  const { error } = await supabase
    .from("goods_receipt_lines")
    .update({
      ingredient_id,
      suggested_ingredient_id: null,
      match_status: "matched",
      match_confidence: 1.0,
      is_nieuw_ingredient: false,
    })
    .eq("id", line_id);
  if (error) throw error;
}

export function usePakbonLineMatch() {
  const qc = useQueryClient();

  const invalidate = (receipt_id: string) => {
    qc.invalidateQueries({ queryKey: ["goods-receipt-detail", receipt_id] });
    qc.invalidateQueries({ queryKey: ["goods-receipts"] });
  };

  const confirmSuggestion = useMutation({
    mutationFn: async (args: ConfirmSuggestionArgs) => {
      await linkLineToIngredient(args.line_id, args.suggested_ingredient_id);
      await writeAlias(args, args.suggested_ingredient_id);
    },
    onSuccess: (_d, vars) => {
      invalidate(vars.receipt_id);
      nestoToast.success("Gekoppeld — wordt voortaan herkend");
    },
    onError: (err: any) => {
      nestoToast.error("Koppelen mislukt", err?.message ?? "Onbekende fout");
    },
  });

  const pickOtherIngredient = useMutation({
    mutationFn: async (args: PickOtherArgs) => {
      await linkLineToIngredient(args.line_id, args.ingredient_id);
      await writeAlias(args, args.ingredient_id);
    },
    onSuccess: (_d, vars) => {
      invalidate(vars.receipt_id);
      nestoToast.success("Gekoppeld — wordt voortaan herkend");
    },
    onError: (err: any) => {
      nestoToast.error("Koppelen mislukt", err?.message ?? "Onbekende fout");
    },
  });

  const createNewIngredient = useMutation({
    mutationFn: async (args: CreateNewArgs) => {
      const { data: created, error: cErr } = await supabase
        .from("ingredienten")
        .insert({
          location_id: args.location_id,
          naam: args.naam.trim(),
          categorie: "overig",
          eenheid: args.display_eenheid ?? args.base_unit,
          base_unit: args.base_unit,
          is_variable_weight: args.is_variable_weight ?? false,
          created_by_source: "pakbon_kok",
        })
        .select("id")
        .single();
      if (cErr) throw cErr;
      await linkLineToIngredient(args.line_id, created.id);
      await writeAlias(args, created.id);
      return created.id;
    },
    onSuccess: (_d, vars) => {
      invalidate(vars.receipt_id);
      nestoToast.success(`"${vars.naam}" aangemaakt en gekoppeld`);
    },
    onError: (err: any) => {
      nestoToast.error("Aanmaken mislukt", err?.message ?? "Onbekende fout");
    },
  });

  return { confirmSuggestion, pickOtherIngredient, createNewIngredient };
}
