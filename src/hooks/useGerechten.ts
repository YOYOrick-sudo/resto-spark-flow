import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface GerechtRow {
  id: string;
  naam: string;
  categorie: string;
  beschrijving: string | null;
  verkoopprijs: number | null;
  kostprijs: number;
  marge_percentage: number | null;
  foto_url: string | null;
  is_actief: boolean;
  is_archived: boolean;
  archived_at: string | null;
  location_id: string;
  created_at: string;
  updated_at: string;
}

export interface GerechtenFilters {
  search: string;
  categorie: string;
  showArchived: boolean;
}

export function useGerechten(filters: GerechtenFilters) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ["gerechten", locationId, filters.showArchived],
    queryFn: async () => {
      let query = supabase
        .from("gerechten")
        .select("*")
        .eq("location_id", locationId!)
        .order("naam", { ascending: true });

      if (!filters.showArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as GerechtRow[];
    },
    enabled: !!locationId,
  });
}

export function filterGerechten(
  data: GerechtRow[] | undefined,
  filters: GerechtenFilters
): GerechtRow[] {
  if (!data) return [];
  let result = [...data];

  if (filters.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (g) =>
        g.naam.toLowerCase().includes(s) ||
        g.categorie.toLowerCase().includes(s)
    );
  }

  if (filters.categorie) {
    result = result.filter((g) => g.categorie === filters.categorie);
  }

  return result;
}
