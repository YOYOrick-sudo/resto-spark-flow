import { supabase } from "@/integrations/supabase/client";

interface SuggestedIngredient {
  naam: string;
  hoeveelheid: number;
  eenheid: string;
  bron: "bijna_verlopen" | "overstocked" | "basis";
}

export interface MatchedMealItem {
  id: string;
  type: "halffabricaat" | "ingrediënt";
  naam: string;
  hoeveelheid: number;
  eenheid: string;
  kostprijs: number | null;
  receptId?: string;
  ingredientId?: string;
}

export async function matchSuggestieToItems(
  ingredienten: SuggestedIngredient[],
  locationId: string
): Promise<MatchedMealItem[]> {
  const items: MatchedMealItem[] = [];

  for (const ing of ingredienten) {
    // 1. Search in halffabricaten first
    const { data: hf } = await supabase
      .from("recepten")
      .select("id, naam, porties, totale_kostprijs")
      .eq("location_id", locationId)
      .eq("type", "halffabricaat")
      .ilike("naam", `%${ing.naam}%`)
      .limit(1);

    if (hf && hf.length > 0) {
      const kostprijsPerPortie = hf[0].porties
        ? (hf[0].totale_kostprijs ?? 0) / hf[0].porties
        : null;
      items.push({
        id: crypto.randomUUID(),
        type: "halffabricaat",
        naam: hf[0].naam,
        hoeveelheid: ing.hoeveelheid,
        eenheid: ing.eenheid === "portie" ? "portie" : ing.eenheid,
        kostprijs: kostprijsPerPortie,
        receptId: hf[0].id,
      });
      continue;
    }

    // 2. Search in ingredienten
    const { data: ingr } = await supabase
      .from("ingredienten")
      .select("id, naam, eenheid, kostprijs")
      .eq("location_id", locationId)
      .eq("is_archived", false)
      .ilike("naam", `%${ing.naam}%`)
      .limit(1);

    if (ingr && ingr.length > 0) {
      items.push({
        id: crypto.randomUUID(),
        type: "ingrediënt",
        naam: ingr[0].naam,
        hoeveelheid: ing.hoeveelheid,
        eenheid: ing.eenheid || ingr[0].eenheid,
        kostprijs: ingr[0].kostprijs,
        ingredientId: ingr[0].id,
      });
    }
    // No match → skip, user can add manually
  }

  return items;
}
