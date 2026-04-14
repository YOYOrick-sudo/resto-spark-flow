import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReceptIngredientRow {
  id: string;
  recept_id: string;
  ingredient_id: string;
  hoeveelheid: number;
  eenheid: string;
  sort_order: number;
  notitie: string | null;
  ingredienten: {
    id: string;
    naam: string;
    eenheid: string;
    kostprijs: number | null;
    yield_percentage: number;
  };
}

export interface ReceptAllergeenDetailRow {
  id: string;
  allergeen_id: string;
  status: string;
  allergenen: {
    id: string;
    code: string;
    naam_nl: string;
    naam_en: string;
    sort_order: number;
  };
}

export interface HalffabricaatMethodeRow {
  id: string;
  recept_id: string;
  type: string;
  visuele_eenheid: string;
  output_hoeveelheid: number;
  output_eenheid: string;
  standaard_duur: number;
  houdbaarheid: number | null;
  instructie: string | null;
  sub_recept_id: string | null;
  sort_order: number | null;
  created_at: string | null;
}

export interface ReceptDetail {
  id: string;
  naam: string;
  categorie: string;
  type: string;
  porties: number;
  actieve_bereidingstijd: number | null;
  passieve_bereidingstijd: number | null;
  bereiding: string | null;
  arbeidskostprijs: number;
  totale_ingredientkostprijs: number;
  totale_kostprijs: number;
  kostprijs_berekend_op: string | null;
  verkoopprijs: number | null;
  is_archived: boolean;
  location_id: string;
  created_at: string;
  updated_at: string;
  recept_ingredienten: ReceptIngredientRow[];
  recept_allergenen: ReceptAllergeenDetailRow[];
  halffabricaat_methodes: HalffabricaatMethodeRow[];
}

export function useRecept(id: string | null) {
  return useQuery({
    queryKey: ["recept", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recepten")
        .select(`
          *,
          recept_ingredienten(
            *,
            ingredienten(id, naam, eenheid, kostprijs, yield_percentage)
          ),
          recept_allergenen(
            *,
            allergenen(id, code, naam_nl, naam_en, sort_order)
          ),
          halffabricaat_methodes!halffabricaat_methodes_recept_id_fkey(*)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as unknown as ReceptDetail;
    },
    enabled: !!id,
  });
}
