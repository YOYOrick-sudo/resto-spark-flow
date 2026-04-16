import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { nestoToast } from "@/lib/nestoToast";

interface CreateReceptInput {
  naam: string;
  categorie: string;
  type: string;
  porties: number;
  actieve_bereidingstijd?: number | null;
  passieve_bereidingstijd?: number | null;
  bereiding?: string | null;
}

interface UpdateReceptInput {
  id: string;
  [key: string]: unknown;
}

interface AddIngredientInput {
  receptId: string;
  ingredientId: string;
  hoeveelheid: number;
  eenheid: string;
  sortOrder: number;
}

interface UpdateIngredientHoeveelheidInput {
  id: string;
  hoeveelheid: number;
}

interface AddMethodeInput {
  receptId: string;
  type: string;
  visueleEenheid: string;
  outputHoeveelheid: number;
  outputEenheid: string;
  standaardDuur: number;
  houdbaarheid?: number | null;
  instructie?: string | null;
  subReceptId?: string | null;
  sortOrder: number;
}

interface UpdateMethodeInput {
  id: string;
  [key: string]: unknown;
}

export function useReceptMutations() {
  const queryClient = useQueryClient();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const invalidate = (receptId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["recepten"] });
    if (receptId) {
      queryClient.invalidateQueries({ queryKey: ["recept", receptId] });
    }
  };

  const createRecept = useMutation({
    mutationFn: async (input: CreateReceptInput) => {
      if (!locationId) throw new Error("Geen locatie geselecteerd");
      const { data, error } = await supabase
        .from("recepten")
        .insert({
          location_id: locationId,
          naam: input.naam,
          categorie: input.categorie,
          type: input.type,
          porties: input.porties,
          actieve_bereidingstijd: input.actieve_bereidingstijd ?? null,
          passieve_bereidingstijd: input.passieve_bereidingstijd ?? null,
          bereiding: input.bereiding ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      invalidate();
      
    },
    onError: (err: Error) => nestoToast.error(`Fout: ${err.message}`),
  });

  const updateRecept = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateReceptInput) => {
      const { error } = await supabase
        .from("recepten")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      invalidate(vars.id);
    },
    onError: (err: Error) => nestoToast.error(`Fout: ${err.message}`),
  });

  const archiveRecept = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recepten")
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      nestoToast.success("Halffabricaat gearchiveerd");
    },
    onError: (err: Error) => nestoToast.error(`Fout: ${err.message}`),
  });

  const addIngredient = useMutation({
    mutationFn: async (input: AddIngredientInput) => {
      const { error } = await supabase
        .from("recept_ingredienten")
        .insert({
          recept_id: input.receptId,
          ingredient_id: input.ingredientId,
          hoeveelheid: input.hoeveelheid,
          eenheid: input.eenheid,
          sort_order: input.sortOrder,
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      invalidate(vars.receptId);
      
    },
    onError: (err: Error) => nestoToast.error(`Fout: ${err.message}`),
  });

  const removeIngredient = useMutation({
    mutationFn: async ({ id, receptId }: { id: string; receptId: string }) => {
      const { error } = await supabase
        .from("recept_ingredienten")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return receptId;
    },
    onSuccess: (receptId) => {
      invalidate(receptId);
      
    },
    onError: (err: Error) => nestoToast.error(`Fout: ${err.message}`),
  });

  const updateIngredientHoeveelheid = useMutation({
    mutationFn: async (input: UpdateIngredientHoeveelheidInput) => {
      const { error } = await supabase
        .from("recept_ingredienten")
        .update({ hoeveelheid: input.hoeveelheid })
        .eq("id", input.id);
      if (error) throw error;
    },
    onError: (err: Error) => nestoToast.error(`Fout: ${err.message}`),
  });

  const addMethode = useMutation({
    mutationFn: async (input: AddMethodeInput) => {
      const { error } = await supabase
        .from("halffabricaat_methodes")
        .insert({
          recept_id: input.receptId,
          type: input.type,
          visuele_eenheid: input.visueleEenheid,
          output_hoeveelheid: input.outputHoeveelheid,
          output_eenheid: input.outputEenheid,
          standaard_duur: input.standaardDuur,
          houdbaarheid: input.houdbaarheid ?? null,
          instructie: input.instructie ?? null,
          sub_recept_id: input.subReceptId ?? null,
          sort_order: input.sortOrder,
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      invalidate(vars.receptId);
      
    },
    onError: (err: Error) => nestoToast.error(`Fout: ${err.message}`),
  });

  const updateMethode = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateMethodeInput) => {
      const { error } = await supabase
        .from("halffabricaat_methodes")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onError: (err: Error) => nestoToast.error(`Fout: ${err.message}`),
  });

  const removeMethode = useMutation({
    mutationFn: async ({ id, receptId }: { id: string; receptId: string }) => {
      const { error } = await supabase
        .from("halffabricaat_methodes")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return receptId;
    },
    onSuccess: (receptId) => {
      invalidate(receptId);
      
    },
    onError: (err: Error) => nestoToast.error(`Fout: ${err.message}`),
  });

  const recalculateKostprijs = useMutation({
    mutationFn: async ({
      receptId,
      totaleIngredientkostprijs,
      arbeidskostprijs,
    }: {
      receptId: string;
      totaleIngredientkostprijs: number;
      arbeidskostprijs: number;
    }) => {
      const { data: recept } = await supabase
        .from("recepten")
        .select("porties")
        .eq("id", receptId)
        .single();

      const porties = recept?.porties || 1;
      const totaleKostprijs = totaleIngredientkostprijs + arbeidskostprijs;
      const kostprijsPerPortie = totaleKostprijs / porties;

      const { error } = await supabase
        .from("recepten")
        .update({
          totale_ingredientkostprijs: totaleIngredientkostprijs,
          arbeidskostprijs,
          totale_kostprijs: totaleKostprijs,
          kostprijs_per_portie: kostprijsPerPortie,
          kostprijs_berekend_op: new Date().toISOString(),
        })
        .eq("id", receptId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => invalidate(vars.receptId),
    onError: (err: Error) => nestoToast.error(`Fout: ${err.message}`),
  });

  return {
    createRecept,
    updateRecept,
    archiveRecept,
    addIngredient,
    removeIngredient,
    updateIngredientHoeveelheid,
    addMethode,
    updateMethode,
    removeMethode,
    recalculateKostprijs,
  };
}
