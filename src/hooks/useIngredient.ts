import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { IngredientRow } from "./useIngredienten";

export interface VoorraadBeweging {
  id: string;
  ingredient_id: string;
  type: string;
  hoeveelheid: number;
  bron: string | null;
  opmerking: string | null;
  created_at: string;
  created_by: string | null;
  profiles: { full_name: string | null } | null;
}

export function useIngredient(id: string | null) {
  return useQuery({
    queryKey: ["ingredient", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredienten")
        .select(`
          *,
          ingredient_allergenen(
            id,
            allergeen_id,
            status,
            bron,
            allergenen(id, code, naam_nl, naam_en, sort_order)
          )
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as IngredientRow;
    },
    enabled: !!id,
  });
}

export function useVoorraadBewegingen(ingredientId: string | null) {
  return useQuery({
    queryKey: ["voorraad-bewegingen", ingredientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voorraad_bewegingen")
        .select(`
          *,
          profiles:created_by(full_name)
        `)
        .eq("ingredient_id", ingredientId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as unknown as VoorraadBeweging[];
    },
    enabled: !!ingredientId,
  });
}
