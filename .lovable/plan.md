

# R3 Final Build — 5-tier matching + alle fixes in 1 ronde

## Diagnose toevoegingen

Eerst 1 read-only check: bestaat unique constraint op `leveranciers_artikelen(leverancier_id, artikel_nummer)`? Zo niet → meenemen in migratie.

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'leveranciers_artikelen'::regclass
  AND contype IN ('u', 'p');
```

Plus quick verify dat `fuzzy_match_ingredient` RPC bestaat met juiste signature:
```sql
SELECT proname, pg_get_function_arguments(oid)
FROM pg_proc WHERE proname = 'fuzzy_match_ingredient';
```

## Build (1 ronde, in volgorde)

### Stap 1 — DB migratie
```sql
-- 1a: trigger naar EN
CREATE OR REPLACE FUNCTION public.validate_factuur_regels_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.match_status NOT IN ('matched', 'manual', 'unmatched', 'skipped') THEN
    RAISE EXCEPTION 'Invalid match_status: %. Allowed: matched, manual, unmatched, skipped', NEW.match_status;
  END IF;
  RETURN NEW;
END;
$$;

-- 1b: unique constraint (alleen als nog niet bestaat — diagnose bepaalt)
ALTER TABLE public.leveranciers_artikelen
  ADD CONSTRAINT leveranciers_artikelen_lev_artnr_unique
  UNIQUE (leverancier_id, artikel_nummer);
```

### Stap 2 — `_shared/ai.ts`: timeoutMs support
- `BaseAIOptions` + `timeoutMs?: number` (default 30000)
- `callGateway`: gebruik `opts.timeoutMs ?? 30000` in `setTimeout(() => controller.abort(), …)`

### Stap 3 — `parse-factuur/index.ts`: 4 wijzigingen

**3a.** `status: 'review'` toevoegen aan succes-update (regel ~263)
**3b.** `timeoutMs: 60000` toevoegen aan `callAI` opts (Pro blijft primary)
**3c.** Match-status waardes EN (`unmatched` / `matched`) — werkt na migratie
**3d.** Vervang matching-loop met **5-tier cascade**:

```ts
for (const regel of regels) {
  let ingredientId: string | null = null;
  let matchStatus = "unmatched";
  let matchConfidence: number | null = null;

  const artikelnr = regel.artikelnummer?.toString().trim();
  const productNaam = regel.product_naam?.trim();

  // TIER 1: artikelnummer + leverancier via leveranciers_artikelen → 1.0
  if (artikelnr && leverancierId) {
    const { data } = await supabase
      .from("leveranciers_artikelen")
      .select("ingredient_id")
      .eq("leverancier_id", leverancierId)
      .eq("artikel_nummer", artikelnr)
      .eq("is_actief", true)
      .not("ingredient_id", "is", null)
      .limit(1).maybeSingle();
    if (data?.ingredient_id) {
      ingredientId = data.ingredient_id;
      matchStatus = "matched"; matchConfidence = 1.0;
    }
  }

  // TIER 2: artikelnummer + leverancier via ingredient_aliassen → 0.98
  if (!ingredientId && artikelnr && leverancierId) {
    const { data } = await supabase
      .from("ingredient_aliassen")
      .select("ingredient_id, ingredienten!inner(location_id)")
      .eq("artikelnummer", artikelnr)
      .eq("leverancier_id", leverancierId)
      .eq("ingredienten.location_id", locationId)
      .limit(1).maybeSingle();
    if (data?.ingredient_id) {
      ingredientId = data.ingredient_id;
      matchStatus = "matched"; matchConfidence = 0.98;
    }
  }

  // TIER 3: alias-naam match → 0.95
  if (!ingredientId && productNaam) {
    const { data } = await supabase
      .from("ingredient_aliassen")
      .select("ingredient_id, ingredienten!inner(location_id)")
      .ilike("alias_naam", productNaam)
      .eq("ingredienten.location_id", locationId)
      .limit(1).maybeSingle();
    if (data?.ingredient_id) {
      ingredientId = data.ingredient_id;
      matchStatus = "matched"; matchConfidence = 0.95;
    }
  }

  // TIER 4: exacte ingredient-naam (ilike) → 0.9
  if (!ingredientId && productNaam) {
    const { data } = await supabase
      .from("ingredienten")
      .select("id")
      .eq("location_id", locationId)
      .ilike("naam", productNaam)
      .limit(1).maybeSingle();
    if (data) {
      ingredientId = data.id;
      matchStatus = "matched"; matchConfidence = 0.9;
    }
  }

  // TIER 5: fuzzy match via RPC → similarity (alleen > 0.6)
  if (!ingredientId && productNaam) {
    const { data: fuzzy } = await supabase.rpc("fuzzy_match_ingredient", {
      p_location_id: locationId,
      p_naam: productNaam,
    });
    if (fuzzy?.length && fuzzy[0].similarity > 0.6) {
      ingredientId = fuzzy[0].id;
      matchStatus = "matched";
      matchConfidence = fuzzy[0].similarity;
      // UI toont automatisch "AI suggestie" badge bij confidence < 0.85
    }
  }

  regelInserts.push({
    factuur_id: factuurId,
    product_naam_herkend: productNaam ?? "Onbekend",
    hoeveelheid: regel.hoeveelheid ?? null,
    eenheid: regel.eenheid ?? null,
    prijs_per_eenheid: regel.prijs_per_eenheid ?? null,
    totaal: regel.totaal ?? null,
    ingredient_id: ingredientId,
    match_status: matchStatus,
    match_confidence: matchConfidence,
    ai_confidence: regel.confidence ?? null,
    ai_raw_naam: regel.product_naam ?? null,
    ai_raw_artikelnummer: artikelnr ?? null,
    is_nieuw_ingredient: !ingredientId,
  });
}
```

### Stap 4 — `useFactuurMutations.ts`: artikelnummer upsert bij approval

In `goedkeuren` mutation: voor elke regel met `ingredient_id` + `ai_raw_artikelnummer` + factuur heeft `leverancier_id`:
```ts
await supabase.from('leveranciers_artikelen').upsert({
  leverancier_id: factuur.leverancier_id,
  artikel_nummer: regel.ai_raw_artikelnummer,
  ingredient_id: regel.ingredient_id,
  artikel_naam: regel.product_naam_herkend,
  is_actief: true,
  laatst_gesynchroniseerd: new Date().toISOString(),
}, { onConflict: 'leverancier_id,artikel_nummer' });
```

Plus consistency: `(factuur as any).factuur_regels` → `factuur?.regels ?? []` (R3-leftover).

### Stap 5 — Reprocess Kooyman (insert tool)
```sql
DELETE FROM factuur_regels WHERE factuur_id = '<kooyman-id>';
UPDATE factuur_uploads
SET ai_parsing_status='pending', status='verwerken',
    ai_parsed_at=NULL, ai_raw_response=NULL
WHERE id='<kooyman-id>';
```
Dan invoke `parse-factuur` met `{ factuurId }`.

### Stap 6 — DB verify
```sql
SELECT status, ai_parsing_status, ai_confidence_overall
FROM factuur_uploads WHERE id='<kooyman-id>';

SELECT match_status, match_confidence, ai_raw_artikelnummer, product_naam_herkend
FROM factuur_regels WHERE factuur_id='<kooyman-id>'
ORDER BY match_confidence DESC NULLS LAST;
```
Verwacht: `status='review'`, regels > 0, mix van confidence-niveaus.

### Stap 7 — UI smoke test
- `/inkoop` → status-badge "Review"
- Regelslijst zichtbaar met `IngredientMatchBadge` per regel
- Confidence 1.0/0.98 → groen
- Confidence 0.6-0.85 → blauwe "AI suggestie" + [Bevestig]
- Confidence null → grijs "Niet gematcht"
- Approve → check `leveranciers_artikelen` upsert in DB

### Stap 8 — PDF preview (apart, hierna)
`FactuurDetailPanel.tsx`: `createSignedUrl(path, 3600)` + `<iframe>` voor PDF, `<img>` voor images.

## Bestanden

| Bestand | Wijziging |
|---|---|
| Migration | `validate_factuur_regels_status()` → EN-lijst + (cond.) unique constraint `leveranciers_artikelen` |
| `supabase/functions/_shared/ai.ts` | + `timeoutMs?` in `BaseAIOptions`, AbortController gebruikt het |
| `supabase/functions/parse-factuur/index.ts` | + `status:'review'`, + `timeoutMs:60000`, 5-tier matching cascade |
| `src/hooks/useFactuurMutations.ts` | upsert `leveranciers_artikelen` + `factuur.regels` consistency |

## Wat we NIET doen
- Geen NL-rollback (migratie fixt trigger)
- Geen Flash als primary (Pro + 60s timeout)
- Geen DELETE van `factuur_uploads` rij
- Geen PDF preview deze ronde (stap 8 apart)

