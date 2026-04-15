import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";

export interface WasteInput {
  ingredient_id: string;
  hoeveelheid: number;
  eenheid: string;
  categorie: string;
  geschatte_kosten?: number | null;
  reden?: string | null;
}

export function useWasteMutation() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: WasteInput) => {
      if (!locationId) throw new Error("Geen locatie");

      // 1. Waste registratie
      const { error: wasteError } = await supabase
        .from("waste_registraties")
        .insert({
          location_id: locationId,
          ingredient_id: input.ingredient_id,
          hoeveelheid: input.hoeveelheid,
          eenheid: input.eenheid,
          geschatte_kosten: input.geschatte_kosten ?? null,
          categorie: input.categorie,
          reden: input.reden ?? null,
          waste_datum: new Date().toISOString().split("T")[0],
          geregistreerd_door: user?.id ?? null,
        });
      if (wasteError) throw new Error(`Waste registratie: ${wasteError.message}`);

      // 2. Voorraad beweging (no location_id or eenheid column)
      const { error: bewegingError } = await supabase
        .from("voorraad_bewegingen")
        .insert({
          ingredient_id: input.ingredient_id,
          type: "WASTE",
          hoeveelheid: -input.hoeveelheid,
          bron: `Waste: ${input.categorie}`,
          medewerker_id: user?.id ?? null,
        });
      if (bewegingError) throw new Error(`Voorraad beweging: ${bewegingError.message}`);

      // 3. Fetch fresh voorraad to avoid stale data
      const { data: freshIng, error: fetchErr } = await supabase
        .from("ingredienten")
        .select("voorraad")
        .eq("id", input.ingredient_id)
        .single();
      if (fetchErr) throw new Error(`Voorraad ophalen: ${fetchErr.message}`);

      const newVoorraad = Math.max(0, (freshIng.voorraad ?? 0) - input.hoeveelheid);
      const { error: updateError } = await supabase
        .from("ingredienten")
        .update({ voorraad: newVoorraad })
        .eq("id", input.ingredient_id);
      if (updateError) throw new Error(`Voorraad update: ${updateError.message}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waste-registraties"] });
      qc.invalidateQueries({ queryKey: ["ingredient"] });
      qc.invalidateQueries({ queryKey: ["ingredienten"] });
      qc.invalidateQueries({ queryKey: ["ingredient-search"] });
    },
  });
}

/**
 * Batch waste registration for multiple ingredients (e.g. staff meals).
 * Calls useWasteMutation.mutateAsync sequentially per item.
 */
export async function registerBulkWaste(
  items: WasteInput[],
  mutateFn: (input: WasteInput) => Promise<void>
) {
  let count = 0;
  for (const item of items) {
    await mutateFn(item);
    count++;
  }
  return count;
}
