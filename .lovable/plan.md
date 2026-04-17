
# Plan — Quick Fix: cached verpakking bij Tier 1 match

## Root cause

`parse-factuur` laat AI elke keer opnieuw verpakking parsen. AI is non-deterministisch → 2× upload zelfde factuur kan andere `verpakking_hoeveelheid` opleveren → andere `prijs_per_basiseenheid` → fake prijswijzigingen in preview-modal.

Voorbeeld: Gyoza "6×41×18gr 1 doos"
- Run 1: AI → `verpakking_aantal=246` → €0,26/stuk
- Run 2: AI → `verpakking_aantal=18` → €3,61/stuk (+1273%)

## Fix

Bij Tier 1 match (artikelnummer + leverancier_id → ingredient_id via `leveranciers_artikelen`) is er al een cached row. Die row bevat `verpakking_hoeveelheid` + `verpakking_eenheid` (gevuld bij de eerste goedkeuring). Bij volgende uploads gebruiken we die cache i.p.v. AI-output.

Schema is al goed (verified): `leveranciers_artikelen` heeft `verpakking_hoeveelheid` (numeric) + `verpakking_eenheid` (varchar). En `useFactuurMutations.goedkeuren` (regel 615-619) schrijft die cache ook bij goedkeuring. Dus de cache wordt al gevuld — alleen de READ ontbreekt nog.

## Wijzigingen — alleen `supabase/functions/parse-factuur/index.ts`

### 1. Tier 1 query uitbreiden (regel 364-380)

Selecteer ook `verpakking_hoeveelheid` + `verpakking_eenheid` + `id` (voor logging):

```ts
const { data } = await supabase
  .from("leveranciers_artikelen")
  .select("ingredient_id, verpakking_hoeveelheid, verpakking_eenheid")
  .eq("leverancier_id", leverancierId)
  .eq("artikel_nummer", artikelnr)
  .eq("is_actief", true)
  .not("ingredient_id", "is", null)
  .limit(1)
  .maybeSingle();
```

Bewaar resultaat in `tier1Cache` variable (scope = de loop-iteration) zodat we hem later in de verpakking-blok kunnen gebruiken.

### 2. Verpakking-resolve override (regel 459-470)

Vervang de huidige verpakking-bepaling door een **cache-first** versie:

```ts
// R3.5 — VERPAKKING-CONVERSIE met Tier 1 cache override (D.6b quick fix)
const allowedVerpakking = ["doos","pak","fles","krat","zak","jerrycan","bos"];
const rawVerpEenh = regel.verpakking_eenheid?.toString().toLowerCase().trim();
const aiVerpakkingEenheid = rawVerpEenh && allowedVerpakking.includes(rawVerpEenh) ? rawVerpEenh : null;
const aiVerpakkingHvh = typeof regel.verpakking_aantal === "number" && regel.verpakking_aantal > 0
  ? regel.verpakking_aantal
  : null;

// Cache override: als Tier 1 match én cache gevuld → gebruik cache, NEGEER AI
const cacheHasPackaging =
  tier1Cache?.verpakking_hoeveelheid != null && tier1Cache?.verpakking_eenheid != null;
const usedCachedPackaging = cacheHasPackaging;

const verpakkingHvh = cacheHasPackaging
  ? Number(tier1Cache!.verpakking_hoeveelheid)
  : aiVerpakkingHvh;
const verpakkingEenheid = cacheHasPackaging
  ? tier1Cache!.verpakking_eenheid
  : aiVerpakkingEenheid;

const prijsOpFactuur = typeof regel.prijs_per_eenheid === "number" ? regel.prijs_per_eenheid : null;
const prijsPerBasiseenheid = (verpakkingHvh && prijsOpFactuur != null)
  ? prijsOpFactuur / verpakkingHvh
  : prijsOpFactuur;

console.log(
  `[parse-factuur] regel "${productNaam}" tier=${matchConfidence ?? 'none'} ` +
  `cached_packaging_used=${usedCachedPackaging} ` +
  `verpakking=${verpakkingHvh}×${verpakkingEenheid} ` +
  `(ai=${aiVerpakkingHvh}×${aiVerpakkingEenheid})`
);
```

`ai_raw_verpakking_tekst` blijft gewoon `regel.verpakking_raw` — origineel AI-fragment voor referentie, ook als cache gebruikt is.

### 3. `tier1Cache` variabele declareren

In de for-loop, naast `ingredientId/matchStatus/matchConfidence`:
```ts
let tier1Cache: { 
  verpakking_hoeveelheid: number | null; 
  verpakking_eenheid: string | null;
} | null = null;
```

En in Tier 1 success-block: `tier1Cache = { verpakking_hoeveelheid: data.verpakking_hoeveelheid, verpakking_eenheid: data.verpakking_eenheid };`.

## Wat niet verandert

- Tier 2-5 matching: geen cache (alleen `leveranciers_artikelen` heeft de cache-kolommen voor leverancier-specifieke verpakking).
- AI-prompt: blijft identiek (eerste keer parsen blijft AI's taak).
- `useFactuurMutations.goedkeuren`: schrijft al de cache (regels 615-619). ✅
- Geen DB-migratie nodig.
- Geen scope creep: geen Tier 1 AI-skip, geen pakbon-matching.

## Bestandenoverzicht

| # | Actie | Bestand | Regels |
|---|---|---|---|
| 1 | EDIT | `supabase/functions/parse-factuur/index.ts` | 354-380 (declare cache + Tier 1 select), 459-470 (override block + log) |

## Test na deploy

1. Upload Kooyman factuur → noteer Gyoza prijs (bv €0,26/stuk)
2. Goedkeur (vult cache in `leveranciers_artikelen`)
3. Re-upload zelfde factuur → preview-modal: 0 prijswijzigingen voor Gyoza/Zonnebloemolie/Mangoblokjes
4. Edge function logs tonen: `cached_packaging_used=true tier=1` per match
5. Nieuwe leverancier-factuur (geen cache) → `cached_packaging_used=false` → AI-parsing fallback werkt nog
