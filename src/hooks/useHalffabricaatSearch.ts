import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface HalffabricaatSearchResult {
  id: string;
  naam: string;
  categorie: string;
  type: string;
  methodes: {
    id: string;
    type: string;
    output_hoeveelheid: number;
    output_eenheid: string;
    visuele_eenheid: string;
    houdbaarheid: number | null;
  }[];
}

export function useHalffabricaatSearch(search: string) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["halffabricaat-search", locationId, search],
    queryFn: async () => {
      if (!locationId) return [];
      let query = supabase
        .from("recepten")
        .select(`
          id, naam, categorie, type,
          methodes:halffabricaat_methodes(id, type, output_hoeveelheid, output_eenheid, visuele_eenheid, houdbaarheid)
        `)
        .eq("location_id", locationId)
        .eq("is_archived", false)
        .order("naam", { ascending: true })
        .limit(20);

      if (search.trim()) {
        query = query.ilike("naam", `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as HalffabricaatSearchResult[];
    },
    enabled: !!locationId,
  });
}
