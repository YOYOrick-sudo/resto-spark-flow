import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export function useLeveranciers() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["leveranciers", locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leveranciers")
        .select("*, leveranciers_artikelen(id)")
        .eq("location_id", locationId!)
        .order("naam");
      if (error) throw error;
      return (data ?? []).map((l) => ({
        ...l,
        artikel_count: (l.leveranciers_artikelen as any[])?.length ?? 0,
      }));
    },
    enabled: !!locationId,
  });
}
