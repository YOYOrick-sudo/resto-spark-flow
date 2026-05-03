import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface ReceptAllergeenRow {
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

export interface ReceptRow {
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
  archived_at: string | null;
  location_id: string;
  created_at: string;
  updated_at: string;
  recept_allergenen: ReceptAllergeenRow[];
  halffabricaat_methodes: {
    id: string;
    sort_order: number;
    type: string;
    output_hoeveelheid: number;
    output_eenheid: string;
    output_gewicht_per_stuk_g: number | null;
  }[];
}

export interface ReceptenFilters {
  search: string;
  categorie: string;
  showArchived: boolean;
}

export function useRecepten(filters: ReceptenFilters) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["recepten", locationId, filters.showArchived],
    queryFn: async () => {
      let query = supabase
        .from("recepten")
        .select(`
          *,
          recept_allergenen(
            id,
            allergeen_id,
            status,
            allergenen(id, code, naam_nl, naam_en, sort_order)
          ),
          halffabricaat_methodes!halffabricaat_methodes_recept_id_fkey(type, output_hoeveelheid, output_eenheid)
        `)
        .eq("location_id", locationId!)
        .eq("type", "halffabricaat")
        .order("naam", { ascending: true });

      if (!filters.showArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ReceptRow[];
    },
    enabled: !!locationId,
  });
}

export function filterRecepten(
  data: ReceptRow[] | undefined,
  filters: ReceptenFilters
): ReceptRow[] {
  if (!data) return [];
  let result = [...data];

  if (filters.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.naam.toLowerCase().includes(s) ||
        r.categorie.toLowerCase().includes(s)
    );
  }

  if (filters.categorie) {
    result = result.filter((r) => r.categorie === filters.categorie);
  }

  return result;
}
