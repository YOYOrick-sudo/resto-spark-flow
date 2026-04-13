import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { startOfWeek, endOfWeek, format } from "date-fns";

export interface WasteDateRange {
  from: string;
  to: string;
}

export function useWasteRegistraties(dateRange?: WasteDateRange) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const defaultFrom = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const defaultTo = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const from = dateRange?.from ?? defaultFrom;
  const to = dateRange?.to ?? defaultTo;

  return useQuery({
    queryKey: ["waste-registraties", locationId, from, to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waste_registraties")
        .select("*, ingredienten(naam), profiles(first_name, last_name)")
        .eq("location_id", locationId!)
        .gte("waste_datum", from)
        .lte("waste_datum", to)
        .order("waste_datum", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((w) => ({
        ...w,
        ingredient_naam: (w.ingredienten as any)?.naam ?? w.omschrijving ?? "-",
        medewerker: (w.profiles as any)
          ? `${(w.profiles as any).first_name ?? ""} ${(w.profiles as any).last_name ?? ""}`.trim()
          : "-",
      }));
    },
    enabled: !!locationId,
  });
}
