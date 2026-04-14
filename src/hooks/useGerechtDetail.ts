import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GerechtComponent {
  id: string;
  gerecht_id: string;
  type: string;
  recept_id: string | null;
  ingredient_id: string | null;
  hoeveelheid: number;
  eenheid: string;
  kostprijs_snapshot: number | null;
  created_at: string;
  ingredient_naam?: string;
  ingredient_kostprijs?: number | null;
  ingredient_eenheid?: string;
  recept_naam?: string;
  recept_porties?: number;
  recept_totale_kostprijs?: number;
}

export interface GerechtDetail {
  id: string;
  location_id: string;
  naam: string;
  categorie: string;
  beschrijving: string | null;
  verkoopprijs: number | null;
  kostprijs: number;
  marge_percentage: number | null;
  foto_url: string | null;
  is_actief: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  componenten: GerechtComponent[];
}

export function useGerechtDetail(id: string | null) {
  return useQuery({
    queryKey: ["gerecht-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gerechten")
        .select(`
          *,
          gerecht_componenten(
            *,
            ingredienten(naam, kostprijs, eenheid),
            recepten(naam, porties, totale_kostprijs)
          )
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;

      const componenten = ((data as any).gerecht_componenten ?? []).map((c: any) => ({
        ...c,
        ingredient_naam: c.ingredienten?.naam ?? null,
        ingredient_kostprijs: c.ingredienten?.kostprijs ?? null,
        ingredient_eenheid: c.ingredienten?.eenheid ?? null,
        recept_naam: c.recepten?.naam ?? null,
        recept_porties: c.recepten?.porties ?? null,
        recept_totale_kostprijs: c.recepten?.totale_kostprijs ?? null,
      }));

      return { ...data, componenten } as GerechtDetail;
    },
    enabled: !!id,
  });
}
