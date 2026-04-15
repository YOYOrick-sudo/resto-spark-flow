import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export function useIngredientSearch(searchTerm: string) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["ingredient-search", locationId, searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredienten")
        .select("id, naam, eenheid, kostprijs, voorraad, categorie")
        .eq("location_id", locationId!)
        .eq("is_archived", false)
        .ilike("naam", `%${searchTerm}%`)
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!locationId && searchTerm.length >= 2,
  });
}
