import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { subWeeks, format } from "date-fns";

export interface OverstockedItem {
  id: string;
  naam: string;
  hoeveelheid: number;
  eenheid: string;
  geschatte_waarde: number;
  ratio: number;
}

export function useVoorraadOverschot(minWaarde: number = 10) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["voorraad-overschot", locationId, minWaarde],
    queryFn: async (): Promise<OverstockedItem[]> => {
      const { data: ingredients, error } = await supabase
        .from("ingredienten")
        .select("id, naam, voorraad, eenheid, kostprijs, opslag_type")
        .eq("location_id", locationId!)
        .eq("is_archived", false)
        .gt("voorraad", 0);
      if (error) throw error;

      // Get WASTE + OUT movements from last 4 weeks in a single query
      const vierWekenGeleden = format(subWeeks(new Date(), 4), "yyyy-MM-dd");
      const { data: bewegingen } = await supabase
        .from("voorraad_bewegingen")
        .select("ingredient_id, hoeveelheid")
        .in("type", ["WASTE", "OUT"])
        .gte("created_at", `${vierWekenGeleden}T00:00:00`);

      const weekVerbruik = new Map<string, number>();
      for (const b of bewegingen ?? []) {
        const curr = weekVerbruik.get(b.ingredient_id) ?? 0;
        weekVerbruik.set(b.ingredient_id, curr + Math.abs(b.hoeveelheid ?? 0));
      }

      const items: OverstockedItem[] = (ingredients ?? [])
        .filter((ig) => {
          // Exclude dry/non-perishable
          if (ig.opslag_type === "droog") return false;
          const totaalVerbruik = weekVerbruik.get(ig.id) ?? 0;
          const gemiddeldPerWeek = totaalVerbruik / 4;
          if (gemiddeldPerWeek <= 0) return false;
          const ratio = ig.voorraad / gemiddeldPerWeek;
          const waarde = ig.voorraad * (ig.kostprijs ?? 0);
          return ratio > 5 && waarde >= minWaarde;
        })
        .map((ig) => {
          const totaalVerbruik = weekVerbruik.get(ig.id) ?? 0;
          const gemiddeldPerWeek = totaalVerbruik / 4;
          return {
            id: ig.id,
            naam: ig.naam,
            hoeveelheid: ig.voorraad,
            eenheid: ig.eenheid,
            geschatte_waarde: Math.round(ig.voorraad * (ig.kostprijs ?? 0) * 100) / 100,
            ratio: Math.round((ig.voorraad / gemiddeldPerWeek) * 10) / 10,
          };
        })
        .sort((a, b) => b.geschatte_waarde - a.geschatte_waarde);

      return items;
    },
    enabled: !!locationId,
    refetchInterval: 10 * 60 * 1000,
  });
}
