import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface BestellingFilters {
  status?: string;
  leverancierId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useBestellingen(filters?: BestellingFilters) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["bestellingen", locationId, filters],
    queryFn: async () => {
      let query = supabase
        .from("bestellingen")
        .select("*, leveranciers(naam), bestelregels(id)")
        .eq("location_id", locationId!)
        .order("created_at", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.leverancierId) query = query.eq("leverancier_id", filters.leverancierId);
      if (filters?.dateFrom) query = query.gte("besteldatum", filters.dateFrom);
      if (filters?.dateTo) query = query.lte("besteldatum", filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((b) => ({
        ...b,
        leverancier_naam: (b.leveranciers as any)?.naam ?? "Onbekend",
        regels_count: (b.bestelregels as any[])?.length ?? 0,
      }));
    },
    enabled: !!locationId,
  });
}

export function useBestelling(id: string | null) {
  return useQuery({
    queryKey: ["bestelling", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bestellingen")
        .select("*, leveranciers(naam, contactpersoon, email), bestelregels(*, ingredienten(naam, eenheid))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
