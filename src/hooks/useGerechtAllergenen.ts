import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllergenen } from "@/hooks/useIngredienten";

export interface GerechtAllergeen {
  allergeen_id: string;
  code: string;
  naam_nl: string;
  sort_order: number;
  status: "bevat" | "kan_bevatten" | "geen" | "onbekend";
}

export function useGerechtAllergenen(gerechtId: string | null) {
  const { data: allergeenRef } = useAllergenen();

  return useQuery({
    queryKey: ["gerecht-allergenen", gerechtId],
    queryFn: async (): Promise<GerechtAllergeen[]> => {
      if (!gerechtId || !allergeenRef) return [];

      // 1. Get all components
      const { data: componenten, error: cErr } = await supabase
        .from("gerecht_componenten")
        .select("type, ingredient_id, recept_id")
        .eq("gerecht_id", gerechtId);
      if (cErr) throw cErr;

      const ingredientIds = new Set<string>();

      // Direct ingredients
      for (const c of (componenten ?? []) as any[]) {
        if (c.type === "ingredient" && c.ingredient_id) {
          ingredientIds.add(c.ingredient_id);
        }
      }

      // Halffabricaat → recept_ingredienten → ingredient_id
      const receptIds = ((componenten ?? []) as any[])
        .filter((c) => c.type === "halffabricaat" && c.recept_id)
        .map((c) => c.recept_id!);

      if (receptIds.length > 0) {
        const { data: ri, error: riErr } = await supabase
          .from("recept_ingredienten")
          .select("ingredient_id")
          .in("recept_id", receptIds);
        if (riErr) throw riErr;
        for (const r of (ri ?? []) as any[]) {
          if (r.ingredient_id) ingredientIds.add(r.ingredient_id);
        }
      }

      // 2. Get allergenen for all ingredient_ids
      const allIds = Array.from(ingredientIds);
      if (allIds.length === 0) {
        return allergeenRef.map((a: any) => ({
          allergeen_id: a.id,
          code: a.code,
          naam_nl: a.naam_nl,
          sort_order: a.sort_order,
          status: "geen" as const,
        }));
      }

      const { data: ia, error: iaErr } = await supabase
        .from("ingredient_allergenen")
        .select("allergeen_id, status")
        .in("ingredient_id", allIds);
      if (iaErr) throw iaErr;

      // 3. Aggregate: bevat > kan_bevatten > geen
      const statusMap = new Map<string, string>();
      for (const row of (ia ?? []) as any[]) {
        const current = statusMap.get(row.allergeen_id);
        if (row.status === "bevat") {
          statusMap.set(row.allergeen_id, "bevat");
        } else if (row.status === "kan_bevatten" && current !== "bevat") {
          statusMap.set(row.allergeen_id, "kan_bevatten");
        } else if (!current) {
          statusMap.set(row.allergeen_id, row.status);
        }
      }

      return allergeenRef.map((a: any) => ({
        allergeen_id: a.id,
        code: a.code,
        naam_nl: a.naam_nl,
        sort_order: a.sort_order,
        status: (statusMap.get(a.id) ?? "geen") as GerechtAllergeen["status"],
      }));
    },
    enabled: !!gerechtId && !!allergeenRef,
  });
}
