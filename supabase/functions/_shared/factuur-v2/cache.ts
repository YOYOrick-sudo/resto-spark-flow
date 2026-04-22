// supabase/functions/_shared/factuur-v2/cache.ts
// Sprint Factuur-AI V2 — Tier-1 cache lookup (artikelnummer-match).
//
// Optie (a) uit plan: alleen exact artikelnummer-match per leverancier.
// Geen semantic search, geen trigram. Onbekend → is_nieuw_ingredient=true.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface Tier1Hit {
  ingredient_id: string;
  artikel_nummer: string;
}

/**
 * Bulk-lookup: gegeven een lijst artikelnummers + leverancier, return mapping
 * artikelnummer → ingredient_id voor alle hits.
 *
 * Onbekende artikelnummers staan simpelweg niet in de Map.
 */
export async function lookupTier1(
  supabase: SupabaseClient,
  leverancierId: string,
  artikelnummers: string[],
): Promise<Map<string, Tier1Hit>> {
  const result = new Map<string, Tier1Hit>();
  const cleaned = artikelnummers.filter((a) => !!a && a.trim().length > 0);
  if (cleaned.length === 0) return result;

  const { data, error } = await supabase
    .from("leveranciers_artikelen")
    .select("ingredient_id, artikel_nummer")
    .eq("leverancier_id", leverancierId)
    .eq("is_actief", true)
    .in("artikel_nummer", cleaned);

  if (error) {
    console.warn("[factuur-v2/cache] lookupTier1 failed (soft):", error.message);
    return result;
  }

  for (const row of data ?? []) {
    if (row.artikel_nummer && row.ingredient_id) {
      result.set(row.artikel_nummer, {
        ingredient_id: row.ingredient_id,
        artikel_nummer: row.artikel_nummer,
      });
    }
  }
  return result;
}

/**
 * Upsert leverancier op basis van BTW-nummer of naam.
 * Returns leverancier_id.
 */
export async function upsertLeverancier(
  supabase: SupabaseClient,
  locationId: string,
  naam: string,
  _btwNummer?: string | null,
): Promise<string | null> {
  const naamTrim = naam.trim();
  if (!naamTrim) return null;

  // 1. Probeer match op exact-naam (case-insensitive) binnen location.
  const { data: existing } = await supabase
    .from("leveranciers")
    .select("id")
    .eq("location_id", locationId)
    .ilike("naam", naamTrim)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  // 2. Insert nieuwe leverancier.
  const { data: created, error } = await supabase
    .from("leveranciers")
    .insert({
      location_id: locationId,
      naam: naamTrim,
      is_actief: true,
      koppeling_type: "handmatig",
    })
    .select("id")
    .single();

  if (error) {
    console.warn("[factuur-v2/cache] upsertLeverancier failed:", error.message);
    return null;
  }
  return created?.id as string;
}
