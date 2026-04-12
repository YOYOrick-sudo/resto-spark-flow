import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { nestoToast } from "@/lib/nestoToast";

interface CreateIngredientInput {
  naam: string;
  categorie: string;
  eenheid: string;
  yield_percentage: number;
  opslag_type: string | null;
  opslag_locatie: string | null;
}

interface UpdateIngredientInput {
  id: string;
  [key: string]: unknown;
}

interface CorrectVoorraadInput {
  ingredientId: string;
  nieuweVoorraad: number;
  oudeVoorraad: number;
  opmerking: string;
}

interface UpdateKostprijsInput {
  id: string;
  kostprijs: number;
}

interface UpsertAllergeenInput {
  ingredientId: string;
  allergeenId: string;
  status: string;
}

export function useIngredientMutations() {
  const queryClient = useQueryClient();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["ingredienten"] });
    queryClient.invalidateQueries({ queryKey: ["ingredient"] });
  };

  const createIngredient = useMutation({
    mutationFn: async (input: CreateIngredientInput) => {
      if (!locationId) throw new Error("Geen locatie geselecteerd");

      // Insert ingredient
      const { data: ingredient, error } = await supabase
        .from("ingredienten")
        .insert({
          location_id: locationId,
          naam: input.naam,
          categorie: input.categorie,
          eenheid: input.eenheid,
          yield_percentage: input.yield_percentage,
          opslag_type: input.opslag_type,
          opslag_locatie: input.opslag_locatie,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Create 14 allergen records with status 'onbekend'
      const { data: allergenen } = await supabase
        .from("allergenen")
        .select("id")
        .order("sort_order");

      if (allergenen && allergenen.length > 0) {
        const records = allergenen.map((a) => ({
          ingredient_id: ingredient.id,
          allergeen_id: a.id,
          status: "onbekend",
        }));
        await supabase.from("ingredient_allergenen").insert(records);
      }

      return ingredient.id;
    },
    onSuccess: () => {
      invalidate();
      nestoToast.success("Ingrediënt aangemaakt");
    },
    onError: (err: Error) => {
      nestoToast.error(`Fout: ${err.message}`);
    },
  });

  const updateIngredient = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateIngredientInput) => {
      const { error } = await supabase
        .from("ingredienten")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      nestoToast.success("Ingrediënt bijgewerkt");
    },
    onError: (err: Error) => {
      nestoToast.error(`Fout: ${err.message}`);
    },
  });

  const archiveIngredient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ingredienten")
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      nestoToast.success("Ingrediënt gearchiveerd");
    },
    onError: (err: Error) => {
      nestoToast.error(`Fout: ${err.message}`);
    },
  });

  const correctVoorraad = useMutation({
    mutationFn: async (input: CorrectVoorraadInput) => {
      const verschil = input.nieuweVoorraad - input.oudeVoorraad;

      const { error: bewegingError } = await supabase
        .from("voorraad_bewegingen")
        .insert({
          ingredient_id: input.ingredientId,
          type: "CORRECTIE",
          hoeveelheid: verschil,
          opmerking: input.opmerking || null,
          bron: "handmatig",
        });
      if (bewegingError) throw bewegingError;

      const { error: updateError } = await supabase
        .from("ingredienten")
        .update({ voorraad: input.nieuweVoorraad })
        .eq("id", input.ingredientId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["voorraad-bewegingen"] });
      nestoToast.success("Voorraad gecorrigeerd");
    },
    onError: (err: Error) => {
      nestoToast.error(`Fout: ${err.message}`);
    },
  });

  const updateKostprijs = useMutation({
    mutationFn: async (input: UpdateKostprijsInput) => {
      const { error } = await supabase
        .from("ingredienten")
        .update({
          kostprijs: input.kostprijs,
          kostprijs_bron: "handmatig",
          kostprijs_laatst_bijgewerkt: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      nestoToast.success("Kostprijs bijgewerkt");
    },
    onError: (err: Error) => {
      nestoToast.error(`Fout: ${err.message}`);
    },
  });

  const upsertAllergeenStatus = useMutation({
    mutationFn: async (input: UpsertAllergeenInput) => {
      const { error } = await supabase
        .from("ingredient_allergenen")
        .upsert({
          ingredient_id: input.ingredientId,
          allergeen_id: input.allergeenId,
          status: input.status,
          bron: "handmatig",
          laatst_bijgewerkt: new Date().toISOString(),
        }, { onConflict: "ingredient_id,allergeen_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
    },
    onError: (err: Error) => {
      nestoToast.error(`Fout bij allergeen update: ${err.message}`);
    },
  });

  return {
    createIngredient,
    updateIngredient,
    archiveIngredient,
    correctVoorraad,
    updateKostprijs,
    upsertAllergeenStatus,
  };
}
