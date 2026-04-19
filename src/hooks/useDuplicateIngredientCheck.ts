/**
 * useDuplicateIngredientCheck — R4b-3
 *
 * Debounced (500ms) check op duplicaat-naam binnen huidige location.
 * Case-insensitive (LOWER) match, exclude is_archived.
 *
 * Retourneert het bestaande ingrediënt (of null) zodat de caller een
 * keuze-dialog kan tonen: "Koppel als extra leverancier" of "Maak variant".
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";

export interface DuplicateIngredient {
  id: string;
  naam: string;
  eenheid: string;
  kostprijs: number | null;
  categorie: string;
}

/** Debounce een waarde: pas na `delay`ms zonder verandering wordt nieuwe waarde teruggegeven. */
function useDebouncedValue<T>(value: T, delay = 500): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Single-naam check. Gebruikt in inline forms (typing).
 * @param naam — naam om te checken (raw, wordt zelf getrimd + lowercased in query)
 * @param enabled — schakel uit als invoer leeg of als ingrediënt al gekozen
 */
export function useDuplicateIngredientCheck(
  naam: string,
  enabled = true
): {
  duplicate: DuplicateIngredient | null;
  isChecking: boolean;
} {
  const { currentLocation } = useUserContext();
  const debouncedNaam = useDebouncedValue(naam.trim(), 500);

  const queryEnabled = enabled && debouncedNaam.length >= 2 && !!currentLocation?.id;

  const query = useQuery({
    queryKey: ["duplicate-ingredient", currentLocation?.id, debouncedNaam.toLowerCase()],
    queryFn: async (): Promise<DuplicateIngredient | null> => {
      const { data, error } = await supabase
        .from("ingredienten")
        .select("id, naam, eenheid, kostprijs, categorie")
        .eq("location_id", currentLocation!.id)
        .eq("is_archived", false)
        .ilike("naam", debouncedNaam)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as DuplicateIngredient | null) ?? null;
    },
    enabled: queryEnabled,
    staleTime: 30_000,
  });

  return {
    duplicate: queryEnabled ? query.data ?? null : null,
    isChecking: queryEnabled && query.isFetching,
  };
}

/**
 * Batch-check voor BulkCreateIngredientsDialog. Doet 1 query op alle namen tegelijk
 * en retourneert een Map<naam_lower, DuplicateIngredient>.
 */
export function useBulkDuplicateIngredientCheck(
  namen: string[],
  enabled = true
) {
  const { currentLocation } = useUserContext();
  const cleanNamen = Array.from(
    new Set(namen.map((n) => n.trim()).filter((n) => n.length >= 2))
  );

  return useQuery({
    queryKey: [
      "bulk-duplicate-ingredient",
      currentLocation?.id,
      cleanNamen.sort().join("|").toLowerCase(),
    ],
    queryFn: async (): Promise<Map<string, DuplicateIngredient>> => {
      if (cleanNamen.length === 0) return new Map();
      const { data, error } = await supabase
        .from("ingredienten")
        .select("id, naam, eenheid, kostprijs, categorie")
        .eq("location_id", currentLocation!.id)
        .eq("is_archived", false)
        .in(
          "naam",
          // Postgres .in() is case-sensitive — we doen post-filter op LOWER
          // Maar we sturen wel originele namen mee voor breder net.
          cleanNamen
        );
      if (error) throw error;

      // Daarnaast: ilike-fallback voor case-insensitive duplicaten
      const { data: ilikeData } = await supabase
        .from("ingredienten")
        .select("id, naam, eenheid, kostprijs, categorie")
        .eq("location_id", currentLocation!.id)
        .eq("is_archived", false)
        .or(cleanNamen.map((n) => `naam.ilike.${n.replace(/,/g, "")}`).join(","));

      const map = new Map<string, DuplicateIngredient>();
      const all = [...(data ?? []), ...(ilikeData ?? [])];
      for (const row of all) {
        map.set((row.naam as string).toLowerCase(), row as DuplicateIngredient);
      }
      return map;
    },
    enabled: enabled && cleanNamen.length > 0 && !!currentLocation?.id,
    staleTime: 30_000,
  });
}
