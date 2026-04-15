import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

interface VoorraadNulItem {
  id: string;
  naam: string;
  eenheid: string;
  min_voorraad: number;
}

interface VoorraadLaagItem {
  id: string;
  naam: string;
  eenheid: string;
  voorraad: number;
  min_voorraad: number;
}

export function useVoorraadNul() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["voorraad-nul", locationId],
    queryFn: async () => {
      // Ingredients with stock = 0
      const { data: nulData, error } = await supabase
        .from("ingredienten")
        .select("id, naam, eenheid, min_voorraad")
        .eq("location_id", locationId!)
        .eq("is_archived", false)
        .eq("voorraad", 0);
      if (error) throw error;

      // Low-stock items (voorraad > 0 but below minimum)
      const { data: laagData } = await supabase
        .from("ingredienten")
        .select("id, naam, eenheid, voorraad, min_voorraad")
        .eq("location_id", locationId!)
        .eq("is_archived", false)
        .gt("voorraad", 0)
        .gt("min_voorraad", 0);

      const laag: VoorraadLaagItem[] = (laagData ?? []).filter(
        (ig) => ig.min_voorraad && ig.voorraad < ig.min_voorraad
      ) as VoorraadLaagItem[];

      return {
        nul: (nulData ?? []) as VoorraadNulItem[],
        laag,
      };
    },
    enabled: !!locationId,
  });
}
