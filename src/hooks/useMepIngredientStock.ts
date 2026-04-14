import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MepTask } from "@/hooks/useMepTasks";
import type { IngredientStockMap, IngredientStockItem } from "@/utils/mepPriority";

export function useMepIngredientStock(tasks: MepTask[], enabled: boolean) {
  const receptIds = [...new Set(tasks.map((t) => t.recept_id).filter(Boolean))] as string[];

  return useQuery({
    queryKey: ["mep-ingredient-stock", receptIds],
    queryFn: async (): Promise<IngredientStockMap> => {
      if (receptIds.length === 0) return new Map();

      const { data, error } = await supabase
        .from("recept_ingredienten")
        .select("recept_id, ingredient:ingredienten(id, naam, eenheid, voorraad, min_voorraad)")
        .in("recept_id", receptIds);

      if (error) throw error;

      const map: IngredientStockMap = new Map();
      for (const row of data ?? []) {
        const ing = row.ingredient as any;
        if (!ing) continue;
        const existing = map.get(row.recept_id) ?? [];
        existing.push({
          naam: ing.naam,
          voorraad: ing.voorraad ?? 0,
          min_voorraad: ing.min_voorraad ?? 0,
          eenheid: ing.eenheid,
        });
        map.set(row.recept_id, existing);
      }
      return map;
    },
    enabled: enabled && receptIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
