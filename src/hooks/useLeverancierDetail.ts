import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLeverancierDetail(id: string | null) {
  return useQuery({
    queryKey: ["leverancier-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leveranciers")
        .select("*, leveranciers_artikelen(*, ingredienten(id, naam, eenheid))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
