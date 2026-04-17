import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeveranciersArtikel {
  id: string;
  artikel_nummer: string | null;
  artikel_naam: string;
  prijs_per_eenheid: number | null;
  prijs_per_verpakking: number | null;
  verpakking_hoeveelheid: number | null;
  verpakking_eenheid: string | null;
  laatst_gesynchroniseerd: string | null;
  is_actief: boolean;
  leveranciers: {
    id: string;
    naam: string;
  } | null;
}

export function useLeveranciersArtikelen(ingredientId: string | null) {
  return useQuery({
    queryKey: ["leveranciers-artikelen", ingredientId],
    enabled: !!ingredientId,
    queryFn: async (): Promise<LeveranciersArtikel[]> => {
      const { data, error } = await supabase
        .from("leveranciers_artikelen")
        .select(`
          id, artikel_nummer, artikel_naam,
          prijs_per_eenheid, prijs_per_verpakking,
          verpakking_hoeveelheid, verpakking_eenheid,
          laatst_gesynchroniseerd, is_actief,
          leveranciers ( id, naam )
        `)
        .eq("ingredient_id", ingredientId!)
        .eq("is_actief", true)
        .order("prijs_per_eenheid", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data ?? []) as unknown as LeveranciersArtikel[];
    },
  });
}
