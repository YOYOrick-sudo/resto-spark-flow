import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface IngredientSuggestion {
  id: string;
  naam: string;
  eenheid: string;
  kostprijs: number | null;
  similarity: number;
}

/**
 * Fuzzy-zoek ingrediënten op naam binnen de huidige locatie.
 * Gebruikt extensions.similarity (pg_trgm) via SECURITY DEFINER RPC.
 * Retourneert top 5 met similarity > 0.3.
 */
export function useFuzzyMatchIngredient(naam: string | null | undefined) {
  const { currentLocation } = useUserContext();
  return useQuery({
    queryKey: ["fuzzy-ingredient", currentLocation?.id, naam],
    queryFn: async (): Promise<IngredientSuggestion[]> => {
      if (!currentLocation?.id || !naam || naam.trim().length < 2) return [];
      const { data, error } = await supabase.rpc("fuzzy_match_ingredient", {
        p_location_id: currentLocation.id,
        p_naam: naam,
      });
      if (error) throw error;
      return (data ?? []) as IngredientSuggestion[];
    },
    enabled: !!currentLocation?.id && !!naam && naam.trim().length >= 2,
    staleTime: 60_000,
  });
}
