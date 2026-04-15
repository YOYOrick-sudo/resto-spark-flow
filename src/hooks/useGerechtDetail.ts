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
  recept_methode_output?: number;
  recept_methode_eenheid?: string;
}

export interface GerechtDetail {
  id: string;
  location_id: string;
  naam: string;
  categorie: string;
  beschrijving: string | null;
  omschrijving: string | null;
  bereidingswijze: string | null;
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
            recepten(
              naam, porties, totale_kostprijs,
              halffabricaat_methodes!halffabricaat_methodes_recept_id_fkey(
                output_hoeveelheid, output_eenheid, type
              )
            )
          )
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;

      const componenten = ((data as any).gerecht_componenten ?? []).map((c: any) => {
        const methodes = c.recepten?.halffabricaat_methodes ?? [];
        const primaire = methodes.find((m: any) => m.type === "Bereiden") || methodes[0];
        return {
          ...c,
          ingredient_naam: c.ingredienten?.naam ?? null,
          ingredient_kostprijs: c.ingredienten?.kostprijs ?? null,
          ingredient_eenheid: c.ingredienten?.eenheid ?? null,
          recept_naam: c.recepten?.naam ?? null,
          recept_porties: c.recepten?.porties ?? null,
          recept_totale_kostprijs: c.recepten?.totale_kostprijs ?? null,
          recept_methode_output: primaire?.output_hoeveelheid ?? null,
          recept_methode_eenheid: primaire?.output_eenheid ?? null,
        };
      });

      return { ...data, componenten } as GerechtDetail;
    },
    enabled: !!id,
  });
}
