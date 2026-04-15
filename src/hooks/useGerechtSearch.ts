import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface GerechtSearchResult {
  id: string;
  naam: string;
  categorie: string;
  verkoopprijs: number | null;
}

export function useGerechtSearch(search: string) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["gerecht-search", locationId, search],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from("gerechten")
        .select("id, naam, categorie, verkoopprijs")
        .eq("location_id", locationId)
        .eq("is_archived", false)
        .eq("is_actief", true)
        .ilike("naam", `%${search.trim()}%`)
        .order("naam", { ascending: true })
        .limit(5);

      if (error) throw error;
      return (data ?? []) as GerechtSearchResult[];
    },
    enabled: !!locationId && search.trim().length >= 2,
  });
}
