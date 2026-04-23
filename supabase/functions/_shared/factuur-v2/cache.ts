// supabase/functions/_shared/factuur-v2/cache.ts
// Sprint Factuur-AI V2 — Match-cascade voor regels op factuur.
//
// Tier-1: exact (leverancier_id, artikelnummer)              confidence 1.0
// Tier-2: exact (leverancier_id, lower(artikel_naam))        confidence 0.95
// Tier-3: exact (location_id, lower(ingredient.naam))        confidence 0.85
//          → ongeacht leverancier; auto-upsert leveranciers_artikelen
// Tier-4: alias-match via ingredient_aliassen                confidence 0.85
//
// Alle naam-keys lopen via normalizeMatchKey() — GEEN destructieve
// strip van haakjes of leestekens (eerdere bug bij Boer & Chef).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { escapeForOrIlike, normalizeMatchKey } from "./normalize.ts";

export interface MatchHit {
  ingredient_id: string;
  artikel_nummer?: string | null;
  tier: 1 | 2 | 3 | 4;
  confidence: number;
}

// =====================================================
// Tier-1 — exact artikelnummer per leverancier
// =====================================================
export async function lookupTier1(
  supabase: SupabaseClient,
  leverancierId: string,
  artikelnummers: string[],
): Promise<Map<string, MatchHit>> {
  const result = new Map<string, MatchHit>();
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
        tier: 1,
        confidence: 1.0,
      });
    }
  }
  return result;
}

// =====================================================
// Tier-2/3/4 — gecombineerde lookup via SQL RPC.
// Vervangt aparte PostgREST .or(ilike) calls die faalden op
// haakjes/komma's/quotes door parser-issues. Eén robuuste
// SQL-call retourneert alle hits per tier; caller kiest
// hoogste confidence (= laagste tier-nummer) per naam_key.
// =====================================================
export async function lookupTier2_3_4(
  supabase: SupabaseClient,
  locationId: string,
  leverancierId: string | null,
  namen: string[],
): Promise<Map<string, MatchHit>> {
  const result = new Map<string, MatchHit>();
  const cleaned = Array.from(
    new Set(
      namen
        .map((n) => n?.trim())
        .filter((n): n is string => !!n && n.length > 0),
    ),
  );
  if (cleaned.length === 0) return result;

  const { data, error } = await supabase.rpc("match_ingredienten_by_names", {
    p_location_id: locationId,
    p_leverancier_id: leverancierId,
    p_namen: cleaned,
  });

  if (error) {
    console.warn(
      "[factuur-v2/cache] lookupTier2_3_4 RPC failed (soft):",
      error.message,
    );
    return result;
  }

  // Sorteer op tier ascending: Tier-2 (0.95) wint van Tier-3/4 (0.85).
  const rows = (data ?? []).slice().sort(
    (a: any, b: any) => (a.tier ?? 99) - (b.tier ?? 99),
  );

  for (const row of rows as any[]) {
    if (!row.naam_key || !row.ingredient_id) continue;
    if (result.has(row.naam_key)) continue;
    result.set(row.naam_key, {
      ingredient_id: row.ingredient_id,
      artikel_nummer: row.artikel_nummer ?? null,
      tier: (row.tier as 2 | 3 | 4) ?? 3,
      confidence: typeof row.confidence === "number"
        ? row.confidence
        : Number(row.confidence ?? 0.85),
    });
  }
  return result;
}

// =====================================================
// LEGACY (dead code, behouden voor backwards-compat tot opschoning):
// lookupTier2 / lookupTier3 / lookupTier4 — niet meer gebruikt door
// parse-factuur-v2. Gebruikten PostgREST .or(ilike) wat brak op
// productnamen met haakjes (bv. "Sla rood (radicchio)").
// Vervangen door lookupTier2_3_4 (RPC) hierboven.
// Verwijderen in volgende sprint na bevestiging dat geen andere
// caller deze functies gebruikt.
// =====================================================
export async function lookupTier2(
  supabase: SupabaseClient,
  leverancierId: string,
  namen: string[],
): Promise<Map<string, MatchHit>> {
  const result = new Map<string, MatchHit>();
  const cleaned = Array.from(
    new Set(namen.map((n) => n?.trim()).filter((n): n is string => !!n)),
  );
  if (cleaned.length === 0) return result;

  const orFilter = cleaned
    .map((n) => `artikel_naam.ilike.${escapeForOrIlike(n)}`)
    .join(",");

  const { data, error } = await supabase
    .from("leveranciers_artikelen")
    .select("ingredient_id, artikel_naam, artikel_nummer")
    .eq("leverancier_id", leverancierId)
    .eq("is_actief", true)
    .or(orFilter);

  if (error) {
    console.warn("[factuur-v2/cache] lookupTier2 failed (soft):", error.message);
    return result;
  }

  for (const row of data ?? []) {
    if (!row.artikel_naam || !row.ingredient_id) continue;
    const key = normalizeMatchKey(String(row.artikel_naam));
    if (!result.has(key)) {
      result.set(key, {
        ingredient_id: row.ingredient_id,
        artikel_nummer: row.artikel_nummer ?? null,
        tier: 2,
        confidence: 0.95,
      });
    }
  }
  return result;
}

export async function lookupTier3(
  supabase: SupabaseClient,
  locationId: string,
  namen: string[],
): Promise<Map<string, MatchHit>> {
  const result = new Map<string, MatchHit>();
  const cleaned = Array.from(
    new Set(namen.map((n) => n?.trim()).filter((n): n is string => !!n)),
  );
  if (cleaned.length === 0) return result;

  const orFilter = cleaned
    .map((n) => `naam.ilike.${escapeForOrIlike(n)}`)
    .join(",");

  const { data, error } = await supabase
    .from("ingredienten")
    .select("id, naam")
    .eq("location_id", locationId)
    .eq("is_archived", false)
    .or(orFilter);

  if (error) {
    console.warn("[factuur-v2/cache] lookupTier3 failed (soft):", error.message);
    return result;
  }

  for (const row of data ?? []) {
    if (!row.naam || !row.id) continue;
    const key = normalizeMatchKey(String(row.naam));
    if (!result.has(key)) {
      result.set(key, {
        ingredient_id: row.id,
        tier: 3,
        confidence: 0.85,
      });
    }
  }
  return result;
}

export async function lookupTier4(
  supabase: SupabaseClient,
  locationId: string,
  leverancierId: string | null,
  namen: string[],
): Promise<Map<string, MatchHit>> {
  const result = new Map<string, MatchHit>();
  const cleaned = Array.from(
    new Set(namen.map((n) => n?.trim()).filter((n): n is string => !!n)),
  );
  if (cleaned.length === 0) return result;

  const orFilter = cleaned
    .map((n) => `alias_naam.ilike.${escapeForOrIlike(n)}`)
    .join(",");

  let query = supabase
    .from("ingredient_aliassen")
    .select(
      "alias_naam, ingredient_id, leverancier_id, ingredienten!inner(location_id, is_archived)",
    )
    .eq("ingredienten.location_id", locationId)
    .eq("ingredienten.is_archived", false)
    .or(orFilter);

  if (leverancierId) {
    query = query.or(
      `leverancier_id.eq.${leverancierId},leverancier_id.is.null`,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.warn("[factuur-v2/cache] lookupTier4 failed (soft):", error.message);
    return result;
  }

  const rows = (data ?? []).slice().sort((a: any, b: any) => {
    const aHasLev = a.leverancier_id && a.leverancier_id === leverancierId
      ? 0
      : 1;
    const bHasLev = b.leverancier_id && b.leverancier_id === leverancierId
      ? 0
      : 1;
    return aHasLev - bHasLev;
  });

  for (const row of rows as any[]) {
    if (!row.alias_naam || !row.ingredient_id) continue;
    const key = normalizeMatchKey(String(row.alias_naam));
    if (!result.has(key)) {
      result.set(key, {
        ingredient_id: row.ingredient_id,
        tier: 4,
        confidence: 0.85,
      });
    }
  }
  return result;
}

// =====================================================
// Auto-upsert leveranciers_artikelen na Tier-3/4 hit.
// Idempotent: bestaande (leverancier_id, ingredient_id, artikel_nummer NULL)
// wordt geüpdatet, anders insert.
// =====================================================
export async function upsertLeverancierArtikelFromMatch(
  supabase: SupabaseClient,
  args: {
    leverancierId: string;
    ingredientId: string;
    artikelNummer?: string | null;
    artikelNaam: string;
    prijsPerEenheid?: number | null;
    verpakkingEenheid?: string | null;
    verpakkingHoeveelheid?: number | null;
  },
): Promise<void> {
  const {
    leverancierId,
    ingredientId,
    artikelNummer,
    artikelNaam,
    prijsPerEenheid,
    verpakkingEenheid,
    verpakkingHoeveelheid,
  } = args;

  try {
    if (artikelNummer && artikelNummer.trim().length > 0) {
      // Met artnr → upsert op (leverancier_id, artikel_nummer).
      const { data: existing } = await supabase
        .from("leveranciers_artikelen")
        .select("id")
        .eq("leverancier_id", leverancierId)
        .eq("artikel_nummer", artikelNummer)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from("leveranciers_artikelen")
          .update({
            ingredient_id: ingredientId,
            artikel_naam: artikelNaam,
            prijs_per_eenheid: prijsPerEenheid ?? undefined,
            verpakking_eenheid: verpakkingEenheid ?? undefined,
            verpakking_hoeveelheid: verpakkingHoeveelheid ?? undefined,
            is_actief: true,
            laatst_gesynchroniseerd: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("leveranciers_artikelen").insert({
          leverancier_id: leverancierId,
          ingredient_id: ingredientId,
          artikel_nummer: artikelNummer,
          artikel_naam: artikelNaam,
          prijs_per_eenheid: prijsPerEenheid ?? null,
          verpakking_eenheid: verpakkingEenheid ?? null,
          verpakking_hoeveelheid: verpakkingHoeveelheid ?? null,
          is_actief: true,
          laatst_gesynchroniseerd: new Date().toISOString(),
        });
      }
    } else {
      // Zonder artnr → match op (leverancier_id, ingredient_id, artikel_nummer IS NULL).
      const { data: existing } = await supabase
        .from("leveranciers_artikelen")
        .select("id")
        .eq("leverancier_id", leverancierId)
        .eq("ingredient_id", ingredientId)
        .is("artikel_nummer", null)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from("leveranciers_artikelen")
          .update({
            artikel_naam: artikelNaam,
            prijs_per_eenheid: prijsPerEenheid ?? undefined,
            verpakking_eenheid: verpakkingEenheid ?? undefined,
            verpakking_hoeveelheid: verpakkingHoeveelheid ?? undefined,
            is_actief: true,
            laatst_gesynchroniseerd: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("leveranciers_artikelen").insert({
          leverancier_id: leverancierId,
          ingredient_id: ingredientId,
          artikel_nummer: null,
          artikel_naam: artikelNaam,
          prijs_per_eenheid: prijsPerEenheid ?? null,
          verpakking_eenheid: verpakkingEenheid ?? null,
          verpakking_hoeveelheid: verpakkingHoeveelheid ?? null,
          is_actief: true,
          laatst_gesynchroniseerd: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn(
      "[factuur-v2/cache] upsertLeverancierArtikelFromMatch failed (soft):",
      (err as Error).message,
    );
  }
}

// =====================================================
// Upsert leverancier op basis van naam (case-insensitive) per location.
// =====================================================
export async function upsertLeverancier(
  supabase: SupabaseClient,
  locationId: string,
  naam: string,
  _btwNummer?: string | null,
): Promise<string | null> {
  const naamTrim = naam.trim();
  if (!naamTrim) return null;

  const { data: existing } = await supabase
    .from("leveranciers")
    .select("id")
    .eq("location_id", locationId)
    .ilike("naam", naamTrim)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

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

// =====================================================
// Helpers — naam-normalisatie verhuisd naar ./normalize.ts
// (zie escapeForOrIlike, normalizeMatchKey)
// =====================================================
