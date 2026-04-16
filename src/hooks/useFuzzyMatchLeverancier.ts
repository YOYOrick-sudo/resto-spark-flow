import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface LeverancierSuggestion {
  id: string;
  naam: string;
  similarity: number;
}

/**
 * Geeft fuzzy-match suggesties voor een leverancier-naam binnen huidige locatie.
 * Gebruikt pg_trgm similarity > 0.3 — top 5 resultaten.
 */
export function useFuzzyMatchLeverancier(naam: string | null | undefined) {
  const { currentLocation } = useUserContext();
  return useQuery({
    queryKey: ["fuzzy-leverancier", currentLocation?.id, naam],
    queryFn: async (): Promise<LeverancierSuggestion[]> => {
      if (!currentLocation?.id || !naam || naam.trim().length < 2) return [];
      const { data, error } = await supabase.rpc("fuzzy_match_leverancier", {
        p_location_id: currentLocation.id,
        p_naam: naam,
      });
      if (error) throw error;
      return (data ?? []) as LeverancierSuggestion[];
    },
    enabled: !!currentLocation?.id && !!naam && naam.trim().length >= 2,
    staleTime: 60_000,
  });
}
