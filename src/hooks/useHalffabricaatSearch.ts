import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface HalffabricaatSearchResult {
  id: string;
  naam: string;
  categorie: string;
  type: string;
  porties: number;
  totale_kostprijs: number;
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
      const { data, error } = await supabase
        .from("recepten")
        .select(`
          id, naam, categorie, type, porties, totale_kostprijs,
          methodes:halffabricaat_methodes!halffabricaat_methodes_recept_id_fkey(id, type, output_hoeveelheid, output_eenheid, visuele_eenheid, houdbaarheid)
        `)
        .eq("location_id", locationId)
        .eq("is_archived", false)
        .eq("type", "halffabricaat")
        .ilike("naam", `%${search.trim()}%`)
        .order("naam", { ascending: true })
        .limit(5);

      if (error) throw error;
      return (data ?? []) as unknown as HalffabricaatSearchResult[];
    },
    enabled: !!locationId && search.trim().length >= 2,
  });
}
