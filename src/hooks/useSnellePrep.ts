import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { nestoToast } from "@/lib/nestoToast";

export interface SnellePrepInput {
  ingredientId: string;
  ingredientNaam: string;
  handeling: string;
  hoeveelheid: number;
  eenheid: string;
  yieldPercentage: number;
  duurMinuten: number;
  taskDate: string;
}

export function useSnellePrep() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useMutation({
    mutationFn: async (input: SnellePrepInput) => {
      if (!locationId) throw new Error("Geen locatie geselecteerd");

      const titel = input.ingredientNaam;

      // 1. Maak halffabricaat (recept) aan
      const { data: recept, error: receptErr } = await supabase
        .from("recepten")
        .insert({
          location_id: locationId,
          naam: titel,
          categorie: "Prep",
          type: "halffabricaat",
          porties: 1,
          actieve_bereidingstijd: input.duurMinuten,
        })
        .select("id")
        .single();
      if (receptErr) throw receptErr;

      // 2. Koppel ingrediënt
      const { error: ingredErr } = await supabase
        .from("recept_ingredienten")
        .insert({
          recept_id: recept.id,
          ingredient_id: input.ingredientId,
          hoeveelheid: input.hoeveelheid,
          eenheid: input.eenheid,
        });
      if (ingredErr) throw ingredErr;

      // 3. Maak methode aan
      const outputHoeveelheid = input.hoeveelheid * (input.yieldPercentage / 100);
      const { data: methode, error: methodeErr } = await supabase
        .from("halffabricaat_methodes")
        .insert({
          recept_id: recept.id,
          type: input.handeling,
          output_hoeveelheid: outputHoeveelheid,
          output_eenheid: input.eenheid,
          visuele_eenheid: `${outputHoeveelheid} ${input.eenheid}`,
          standaard_duur: input.duurMinuten,
          houdbaarheid: input.handeling === "Marineren" ? 2 : 1,
        })
        .select("id")
        .single();
      if (methodeErr) throw methodeErr;

      // 4. Maak MEP taak aan
      const { error: taskErr } = await supabase
        .from("mep_tasks")
        .insert({
          location_id: locationId,
          title: titel,
          category: "Prep",
          task_date: input.taskDate,
          recept_id: recept.id,
          methode_id: methode.id,
          units: 1,
          prioriteit: "Normaal",
          status: "pending",
        });
      if (taskErr) throw taskErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mep-tasks"] });
      qc.invalidateQueries({ queryKey: ["halffabricaat-search"] });
      nestoToast.success("Prep aangemaakt en op MEP gezet!");
    },
    onError: (e: Error) => nestoToast.error("Aanmaken mislukt", e.message),
  });
}
