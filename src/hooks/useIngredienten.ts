import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface IngredientAllergeenRow {
  id: string;
  allergeen_id: string;
  status: string;
  bron: string | null;
  allergenen: {
    id: string;
    code: string;
    naam_nl: string;
    naam_en: string;
    sort_order: number;
  };
}

export interface IngredientRow {
  id: string;
  naam: string;
  categorie: string;
  eenheid: string;
  voorraad: number;
  min_voorraad: number;
  max_voorraad: number | null;
  kostprijs: number | null;
  kostprijs_bron: string | null;
  kostprijs_laatst_bijgewerkt: string | null;
  yield_percentage: number;
  opslag_type: string | null;
  opslag_locatie: string | null;
  is_archived: boolean;
  archived_at: string | null;
  location_id: string;
  created_at: string;
  updated_at: string;
  ingredient_allergenen: IngredientAllergeenRow[];
}

export interface IngredientenFilters {
  search: string;
  categorie: string;
  voorraadStatus: string;
  showArchived: boolean;
}

export function getVoorraadStatus(voorraad: number, minVoorraad: number) {
  if (minVoorraad === 0) return "op-voorraad";
  if (voorraad < minVoorraad) return "laag";
  if (voorraad < minVoorraad * 2) return "op-voorraad";
  return "overschot";
}

export function useIngredienten(filters: IngredientenFilters) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["ingredienten", locationId, filters.showArchived],
    queryFn: async () => {
      let query = supabase
        .from("ingredienten")
        .select(`
          *,
          ingredient_allergenen(
            id,
            allergeen_id,
            status,
            bron,
            allergenen(id, code, naam_nl, naam_en, sort_order)
          )
        `)
        .order("naam", { ascending: true });

      if (!filters.showArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as IngredientRow[];
    },
    enabled: !!locationId,
  });
}

export function useAllergenen() {
  return useQuery({
    queryKey: ["allergenen-reference"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allergenen")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour — reference data
  });
}

export function filterIngredienten(
  data: IngredientRow[] | undefined,
  filters: IngredientenFilters
): IngredientRow[] {
  if (!data) return [];
  let result = [...data];

  if (filters.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (i) =>
        i.naam.toLowerCase().includes(s) ||
        i.categorie.toLowerCase().includes(s)
    );
  }

  if (filters.categorie) {
    result = result.filter((i) => i.categorie === filters.categorie);
  }

  if (filters.voorraadStatus) {
    result = result.filter(
      (i) => getVoorraadStatus(i.voorraad, i.min_voorraad) === filters.voorraadStatus
    );
  }

  return result;
}
