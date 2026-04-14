import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { nestoToast } from "@/lib/nestoToast";

export interface EenheidConversie {
  id: string;
  ingredient_id: string;
  van_eenheid: string;
  naar_eenheid: string;
  factor: number;
}

export function useEenheidConversies(ingredientId: string | undefined) {
  return useQuery({
    queryKey: ["eenheid-conversies", ingredientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eenheid_conversies")
        .select("*")
        .eq("ingredient_id", ingredientId!);
      if (error) throw error;
      return data as EenheidConversie[];
    },
    enabled: !!ingredientId,
  });
}

export function useEenheidConversieMutations(ingredientId: string) {
  const qc = useQueryClient();
  const key = ["eenheid-conversies", ingredientId];

  const addConversie = useMutation({
    mutationFn: async (input: { van_eenheid: string; naar_eenheid: string; factor: number }) => {
      const { error } = await supabase
        .from("eenheid_conversies")
        .insert({ ingredient_id: ingredientId, ...input });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      nestoToast.success("Conversie toegevoegd");
    },
    onError: () => nestoToast.error("Kon conversie niet opslaan"),
  });

  const deleteConversie = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("eenheid_conversies")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      nestoToast.success("Conversie verwijderd");
    },
    onError: () => nestoToast.error("Kon conversie niet verwijderen"),
  });

  return { addConversie, deleteConversie };
}
