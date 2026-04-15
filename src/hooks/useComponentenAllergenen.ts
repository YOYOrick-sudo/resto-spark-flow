import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllergenen } from "@/hooks/useIngredienten";
import type { AllergeenPillData } from "@/components/polar/AllergeenPills";
import type { GerechtComponent } from "@/hooks/useGerechtDetail";

/**
 * Batch-fetches allergen data for all gerecht components.
 * Returns a Map<component_id, AllergeenPillData[]> plus a global summary.
 */
export function useComponentenAllergenen(componenten: GerechtComponent[]) {
  const { data: allergeenRef } = useAllergenen();

  return useQuery({
    queryKey: ["componenten-allergenen", componenten.map((c) => c.id).sort().join(",")],
    queryFn: async () => {
      if (!allergeenRef) return { perComponent: new Map<string, AllergeenPillData[]>(), summary: [] as AllergeenPillData[] };

      // Collect all ingredient IDs per component
      const directIngredients = componenten.filter((c) => c.type === "ingredient" && c.ingredient_id);
      const halffabricaten = componenten.filter((c) => c.type === "halffabricaat" && c.recept_id);

      // Map ingredient_id → component_ids (an ingredient can appear in multiple components)
      const ingredientToComponents = new Map<string, Set<string>>();

      for (const c of directIngredients) {
        if (!ingredientToComponents.has(c.ingredient_id!)) ingredientToComponents.set(c.ingredient_id!, new Set());
        ingredientToComponents.get(c.ingredient_id!)!.add(c.id);
      }

      // For halffabricaten, get their sub-ingredients
      if (halffabricaten.length > 0) {
        const receptIds = halffabricaten.map((c) => c.recept_id!);
        const { data: ri } = await supabase
          .from("recept_ingredienten")
          .select("recept_id, ingredient_id")
          .in("recept_id", receptIds);

        for (const row of (ri ?? []) as any[]) {
          if (!row.ingredient_id) continue;
          // Find which component(s) use this recept_id
          for (const c of halffabricaten) {
            if (c.recept_id === row.recept_id) {
              if (!ingredientToComponents.has(row.ingredient_id)) ingredientToComponents.set(row.ingredient_id, new Set());
              ingredientToComponents.get(row.ingredient_id)!.add(c.id);
            }
          }
        }
      }

      const allIngredientIds = Array.from(ingredientToComponents.keys());
      if (allIngredientIds.length === 0) {
        return { perComponent: new Map<string, AllergeenPillData[]>(), summary: [] as AllergeenPillData[] };
      }

      // Fetch all allergen links
      const { data: ia } = await supabase
        .from("ingredient_allergenen")
        .select("allergeen_id, ingredient_id, status")
        .in("ingredient_id", allIngredientIds);

      // Build per-component allergen status maps
      const componentAllergenStatus = new Map<string, Map<string, string>>();

      for (const row of (ia ?? []) as any[]) {
        if (row.status === "geen") continue;
        const compIds = ingredientToComponents.get(row.ingredient_id);
        if (!compIds) continue;
        for (const compId of compIds) {
          if (!componentAllergenStatus.has(compId)) componentAllergenStatus.set(compId, new Map());
          const map = componentAllergenStatus.get(compId)!;
          const current = map.get(row.allergeen_id);
          if (row.status === "bevat") {
            map.set(row.allergeen_id, "bevat");
          } else if (row.status === "kan_bevatten" && current !== "bevat") {
            map.set(row.allergeen_id, "kan_bevatten");
          } else if (!current) {
            map.set(row.allergeen_id, row.status);
          }
        }
      }

      // Convert to AllergeenPillData per component
      const perComponent = new Map<string, AllergeenPillData[]>();
      for (const [compId, statusMap] of componentAllergenStatus) {
        const pills: AllergeenPillData[] = [];
        for (const [allergeenId, status] of statusMap) {
          const ref = allergeenRef.find((a: any) => a.id === allergeenId);
          if (!ref) continue;
          pills.push({
            allergeen_id: allergeenId,
            code: ref.code,
            naam_nl: ref.naam_nl,
            status: status as AllergeenPillData["status"],
          });
        }
        if (pills.length > 0) perComponent.set(compId, pills);
      }

      // Build global summary
      const globalStatus = new Map<string, string>();
      for (const row of (ia ?? []) as any[]) {
        const current = globalStatus.get(row.allergeen_id);
        if (row.status === "bevat") {
          globalStatus.set(row.allergeen_id, "bevat");
        } else if (row.status === "kan_bevatten" && current !== "bevat") {
          globalStatus.set(row.allergeen_id, "kan_bevatten");
        } else if (!current) {
          globalStatus.set(row.allergeen_id, row.status);
        }
      }

      const summary: AllergeenPillData[] = allergeenRef
        .filter((a: any) => {
          const s = globalStatus.get(a.id);
          return s === "bevat" || s === "kan_bevatten";
        })
        .map((a: any) => ({
          allergeen_id: a.id,
          code: a.code,
          naam_nl: a.naam_nl,
          status: globalStatus.get(a.id) as AllergeenPillData["status"],
        }));

      return { perComponent, summary };
    },
    enabled: componenten.length > 0 && !!allergeenRef,
  });
}
