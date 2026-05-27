import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

/**
 * Halffabricaat-voorraad leest uit `ingredienten` (single source of truth).
 * recept_id is de koppeling met het recept. Niet meer uit SUM(productie_batches).
 */
export interface HalffabricaatRow {
  id: string;
  naam: string;
  eenheid: string;
  base_unit: string;
  voorraad: number;
  min_voorraad: number;
  max_voorraad: number | null;
  recept_id: string | null;
  updated_at: string;
  recepten: { id: string; naam: string; porties: number } | null;
}

export function useHalffabricaten() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["halffabricaten", locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from("ingredienten")
        .select(`
          id, naam, eenheid, base_unit, voorraad, min_voorraad, max_voorraad,
          recept_id, updated_at,
          recepten:recept_id(id, naam, porties)
        `)
        .eq("location_id", locationId)
        .eq("is_halffabricaat", true)
        .eq("is_archived", false)
        .order("naam", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as HalffabricaatRow[];
    },
    enabled: !!locationId,
  });
}

export function useHalffabricaat(id: string | null) {
  return useQuery({
    queryKey: ["halffabricaten", "detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredienten")
        .select(`
          id, naam, eenheid, base_unit, voorraad, min_voorraad, max_voorraad,
          recept_id, updated_at, kostprijs,
          recepten:recept_id(id, naam, porties)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as HalffabricaatRow & { kostprijs: number | null };
    },
    enabled: !!id,
  });
}
