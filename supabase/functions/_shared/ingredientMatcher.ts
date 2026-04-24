// supabase/functions/_shared/ingredientMatcher.ts
// Sprint Pakbon V1 — Niet-breaking wrapper rond factuur-v2 match-cascade.
//
// Doel: parse-pakbon hergebruikt EXACT dezelfde Tier 1→2→3→4 matching pipeline
// als parse-factuur-v2, zodat:
//   - één bron van waarheid voor matching-gedrag
//   - bug-fixes (zoals haakjes/leestekens in normalize.ts) auto-doorwerken
//   - factuur-v2 NIET gewijzigd hoeft te worden (alleen re-export)
//
// Architectuur:
//   - Re-exporteert alle Tier-helpers + upserts uit factuur-v2/cache.ts
//   - Voegt `matchIngredientLines()` toe: orchestratie-functie die de hele
//     cascade uitvoert voor een lijst regels (zoals parse-factuur-v2 inline doet)
//
// CORRECTIE: factuur-v2/cache.ts blijft de bron. Deze wrapper voegt alleen
// orchestratie toe — geen kopie van logica.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  lookupTier1,
  lookupTier2_3_4,
  type MatchHit,
  upsertLeverancier,
  upsertLeverancierArtikelFromMatch,
} from "./factuur-v2/cache.ts";
import {
  normalizeMatchKey,
  normalizeMatchKeyStripped,
  stripPackagingSuffix,
} from "./factuur-v2/normalize.ts";

// Re-exports voor callers die direct toegang willen.
export {
  lookupTier1,
  lookupTier2_3_4,
  normalizeMatchKey,
  normalizeMatchKeyStripped,
  stripPackagingSuffix,
  upsertLeverancier,
  upsertLeverancierArtikelFromMatch,
};
export type { MatchHit };

// =====================================================
// Generieke regel-input voor matchIngredientLines.
// Pakbon-regels en factuur-regels kunnen beide naar dit minimale shape mappen.
// =====================================================
export interface MatchableLine {
  artikelnummer?: string | null;
  product_naam: string;
  /** Optioneel: voor auto-upsert leveranciers_artikelen na Tier-3/4 hit. */
  prijs_per_basiseenheid?: number | null;
  verpakking_eenheid?: string | null;
  verpakking_hoeveelheid?: number | null;
}

export interface MatchResult {
  /** Per-regel match (zelfde index als input). null = geen match. */
  matches: Array<MatchHit | null>;
  /** Aantal Tier-1/2/3/4 hits voor logging. */
  stats: { tier1: number; tier2: number; tier3: number; tier4: number; unmatched: number };
}

/**
 * Voert de volledige match-cascade uit: Tier-1 (artikelnummer per leverancier)
 * → Tier-2/3/4 (naam-based via RPC). Identieke logica als parse-factuur-v2.
 *
 * MULTI-LEVERANCIER: als ingredient_naam al bestaat bij ANDERE leverancier
 * (Tier-3 hit), wordt deze NIET geblokkeerd — match wordt teruggegeven met
 * tier=3, caller bepaalt of "extra leverancier" of "nieuw ingredient" UI nodig is.
 *
 * AUTO-UPSERT: bij Tier-3/4 hit + leverancierId → leveranciers_artikelen wordt
 * geüpdatet (idempotent) zodat volgende keer Tier-1 of Tier-2 matcht.
 */
export async function matchIngredientLines(
  supabase: SupabaseClient,
  args: {
    locationId: string;
    leverancierId: string | null;
    lines: MatchableLine[];
    /** Default true: auto-upsert leveranciers_artikelen bij Tier-3/4. */
    autoUpsertOnTier34?: boolean;
  },
): Promise<MatchResult> {
  const { locationId, leverancierId, lines, autoUpsertOnTier34 = true } = args;

  const artikelnummers: string[] = lines
    .map((r) => (r.artikelnummer ?? "").trim())
    .filter((a) => a.length > 0);
  const namen: string[] = lines
    .map((r) => (r.product_naam ?? "").trim())
    .filter((n) => n.length > 0);

  const [tier1Map, tier234Map] = await Promise.all([
    leverancierId
      ? lookupTier1(supabase, leverancierId, artikelnummers)
      : Promise.resolve(new Map<string, MatchHit>()),
    lookupTier2_3_4(supabase, locationId, leverancierId, namen),
  ]);

  const matches: Array<MatchHit | null> = lines.map((r) => {
    const artnr = (r.artikelnummer ?? "").trim();
    const naamKey = normalizeMatchKey(r.product_naam);
    if (artnr && tier1Map.has(artnr)) return tier1Map.get(artnr)!;
    if (naamKey && tier234Map.has(naamKey)) return tier234Map.get(naamKey)!;
    return null;
  });

  // Auto-upsert leveranciers_artikelen voor Tier-3/4 hits (zoals factuur-v2).
  if (autoUpsertOnTier34 && leverancierId) {
    await Promise.all(
      lines.map(async (r, idx) => {
        const hit = matches[idx];
        if (!hit) return;
        if (hit.tier !== 3 && hit.tier !== 4) return;
        await upsertLeverancierArtikelFromMatch(supabase, {
          leverancierId,
          ingredientId: hit.ingredient_id,
          artikelNummer: (r.artikelnummer ?? "").trim() || null,
          artikelNaam: r.product_naam,
          prijsPerEenheid: r.prijs_per_basiseenheid ?? null,
          verpakkingEenheid: r.verpakking_eenheid ?? null,
          verpakkingHoeveelheid: r.verpakking_hoeveelheid ?? null,
        });
      }),
    );
  }

  const stats = { tier1: 0, tier2: 0, tier3: 0, tier4: 0, unmatched: 0 };
  for (const m of matches) {
    if (!m) stats.unmatched++;
    else if (m.tier === 1) stats.tier1++;
    else if (m.tier === 2) stats.tier2++;
    else if (m.tier === 3) stats.tier3++;
    else if (m.tier === 4) stats.tier4++;
  }

  return { matches, stats };
}
