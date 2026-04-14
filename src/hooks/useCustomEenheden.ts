import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

const STANDAARD_EENHEDEN = ["kg", "g", "L", "ml", "st"];

export function useCustomEenheden() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["custom-eenheden", locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ingredienten")
        .select("eenheid")
        .eq("location_id", locationId!)
        .not("eenheid", "in", `(${STANDAARD_EENHEDEN.join(",")})`)
        .order("eenheid");

      if (error) throw error;

      const unique = [...new Set((data || []).map((d) => d.eenheid))];
      return unique;
    },
    enabled: !!locationId,
  });
}

export { STANDAARD_EENHEDEN };
