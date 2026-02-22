
# Sessie 4.2 -- A/B Testing Social Posts + Caption Leercyklus

## Samenvatting

Twee onderdelen: (1) Caption leercyclus activeren -- bewaar AI-origineel vs operator-aanpassing, (2) A/B testing -- genereer twee caption varianten, publiceer beide, vergelijk resultaten. Plus: upsertData bug fixen en oude alternative_caption UI verwijderen.

---

## Deel 1: Database migratie

Vier nieuwe kolommen op `marketing_social_posts`:

```text
ai_original_caption  TEXT           -- originele AI-gegenereerde caption
operator_edited      BOOLEAN        DEFAULT false
ab_test_group        TEXT           -- 'A' of 'B' (null voor normale posts)
ab_test_id           UUID           -- gedeelde UUID die twee A/B varianten koppelt
```

---

## Deel 2: Caption Leercyclus

### 2.1 SocialPost type uitbreiden

**`src/hooks/useMarketingSocialPosts.ts` (edit)**

Voeg 4 velden toe aan `SocialPost` interface:
- `ai_original_caption: string | null`
- `operator_edited: boolean`
- `ab_test_group: string | null`
- `ab_test_id: string | null`

### 2.2 useCreateFullSocialPost uitbreiden

**`src/hooks/useAllSocialPosts.ts` (edit)**

- Voeg `ai_original_caption`, `operator_edited`, `ab_test_group`, `ab_test_id` toe aan de mutation input type (regels 80-89) en de insert row (regels 92-103)

### 2.3 SocialPostCreatorPage caption tracking

**`src/pages/marketing/SocialPostCreatorPage.tsx` (edit)**

- Nieuwe state: `aiOriginalCaption` (string) -- wordt gezet in `handleAIGenerate` (regel 168) wanneer de eerste platform caption wordt opgeslagen
- Bij `handleSubmit` (regels 222-234): vergelijk `content_text` met `aiOriginalCaption`
  - Als `aiOriginalCaption` bestaat en verschilt van de uiteindelijke caption: `ai_original_caption = aiOriginalCaption`, `operator_edited = true`
  - Als ongewijzigd: `ai_original_caption = aiOriginalCaption`, `operator_edited = false`
  - Als geen AI gebruikt: beide velden null/false

### 2.4 marketing-analyze-brand: bug fix + caption leercyclus

**`supabase/functions/marketing-analyze-brand/index.ts` (edit)**

**Bug fix (kritiek):** Regel 232 (`upsertData.review_response_profile = reviewResponseProfile`) gebruikt `upsertData` voordat het op regel 242 wordt gedeclareerd. Fix: verplaats `const upsertData` declaratie (regels 242-253) naar VOOR het review response style blok (voor regel 218).

**Caption leercyklus blok** (na het review response blok):
- Query: `marketing_social_posts WHERE operator_edited = true AND ai_original_caption IS NOT NULL AND location_id = locationId ORDER BY updated_at DESC LIMIT 20`
- Drempel: minimaal 5 resultaten
- AI prompt: vergelijk AI-suggesties met operator-aanpassingen, verfijn het bestaande caption_style_profile (huidige profiel als context meegegeven)
- Opslag: `upsertData.caption_style_profile = verfijndProfiel`

---

## Deel 3: A/B Testing

### 3.1 marketing-generate-content A/B modus

**`supabase/functions/marketing-generate-content/index.ts` (edit)**

- Nieuwe parameter in `generateSocialContent` body: `ab_test: boolean`
- Als `ab_test = true`:
  - System prompt uitbreiden: vraag om 2 varianten (A: huidige stijl, B: alternatieve aanpak met andere openingszin/CTA/hashtags)
  - Tool schema aanpassen: `platforms` wordt genest onder `variants.a` en `variants.b`, elk met dezelfde platformstructuur
  - Output: `{ variants: { a: { platforms: {...} }, b: { platforms: {...} } }, suggested_hashtags, suggested_time, suggested_day }`
- Als `ab_test = false` (of niet meegegeven): bestaand gedrag ongewijzigd

### 3.2 SocialPostCreatorPage A/B UI

**`src/pages/marketing/SocialPostCreatorPage.tsx` (edit)**

**Verwijder oude alternative_caption UI:**
- Verwijder `alternativeCaption` state (regel 90), `showAltCaption` state (regel 91)
- Verwijder props doorvoer naar CaptionSection (regels 338-341)
- Verwijder de "+ Alternatieve caption" button en textarea uit CaptionSection (regels 635-652)
- Verwijder `showAltCaption`, `setShowAltCaption`, `alternativeCaption`, `setAltCaption` uit CaptionSection props (regels 525-528, 545-548)
- Verwijder `alternative_caption` uit handleSubmit (regel 233)

**Nieuwe A/B state en UI:**
- States: `abTestEnabled` (boolean), `variantBCaption` (string), `variantBPlatformCaptions` (Record), `abVariantTab` ('a' | 'b')
- In AI modal (regels 430-461): voeg Switch "A/B Test" toe (default uit)
- Na AI generatie met `ab_test = true`:
  - Sla variant A en B captions apart op in state
  - Toon 2 tabs boven caption area: "Variant A" / "Variant B"
  - Elk met eigen caption textarea
- Bij opslaan met A/B aan:
  - Genereer 1 `ab_test_id` via `crypto.randomUUID()`
  - Loop over `selectedPlatforms` (bestaande for-loop, regel 222)
  - Per platform: maak 2 posts aan:
    - Post A: `ab_test_group = 'A'`, `ab_test_id = sharedId`, originele `scheduled_at`, caption = variant A voor dit platform
    - Post B: `ab_test_group = 'B'`, `ab_test_id = sharedId`, `scheduled_at + 24 uur`, caption = variant B voor dit platform
  - **Alle posts delen dezelfde `ab_test_id`** -- zowel A-Instagram als A-Facebook als B-Instagram als B-Facebook

### 3.3 Multi-platform A/B verduidelijking

Bij Instagram + Facebook geselecteerd met A/B aan:
- 4 posts totaal: A-Instagram, A-Facebook, B-Instagram, B-Facebook
- Alle 4 delen dezelfde `ab_test_id`
- `ab_test_group = 'A'` voor A-Instagram en A-Facebook
- `ab_test_group = 'B'` voor B-Instagram en B-Facebook
- Variant B scheduled_at = Variant A + 24 uur (alle B-posts op hetzelfde moment)

### 3.4 SocialPostsPage A/B badge + vergelijkings-Sheet

**`src/pages/marketing/SocialPostsPage.tsx` (edit)**

- In de tabel (regels 289-290): posts met `ab_test_id` tonen een "A/B" NestoBadge (variant="primary", size="sm") naast de status badge
- Nieuwe state: `selectedAbTestId` (string | null) voor het openen van een Sheet
- Klik op een A/B post row zet `selectedAbTestId`
- Sheet component (inline):
  - Twee kolommen: Variant A vs Variant B
  - Per variant per platform: caption (truncated 100 chars), bereik/engagement/engagement rate uit `analytics` JSON
  - Winnaar: hoogste engagement rate krijgt groene "Winnaar" badge
  - Als beide < 48 uur oud: InfoAlert "Resultaten nog niet compleet"
  - Label onderaan: "Indicatieve vergelijking" met tooltip uitleg

### 3.5 useABTestResults hook

**`src/hooks/useAllSocialPosts.ts` (edit)**

Nieuwe export:
- `useABTestResults(abTestId: string | null)`: query `marketing_social_posts WHERE ab_test_id = abTestId`, return alle varianten (2 of 4 posts), enabled: `!!abTestId`

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| SQL Migratie | 4 kolommen: ai_original_caption, operator_edited, ab_test_group, ab_test_id |
| `src/hooks/useMarketingSocialPosts.ts` | Edit: SocialPost type uitbreiden (4 velden) |
| `src/hooks/useAllSocialPosts.ts` | Edit: createPost input uitbreiden + useABTestResults hook |
| `src/pages/marketing/SocialPostCreatorPage.tsx` | Edit: verwijder old alt caption UI, voeg aiOriginalCaption tracking + A/B toggle + dual variant UI + multi-platform submit logica toe |
| `supabase/functions/marketing-generate-content/index.ts` | Edit: ab_test parameter + dual variant generatie |
| `supabase/functions/marketing-analyze-brand/index.ts` | Edit: fix upsertData bug + caption leercyclus blok |
| `src/pages/marketing/SocialPostsPage.tsx` | Edit: A/B badge in tabel + vergelijkings-Sheet |

---

## Technische details

### upsertData bug fix
Regel 232 zet `upsertData.review_response_profile` maar `upsertData` wordt pas op regel 242 gedeclareerd. Verplaats de declaratie naar voor regel 218. Zowel review response style, caption leercyclus, als de uiteindelijke upsert schrijven dan naar hetzelfde object.

### Oude alternative_caption verwijderen
De "+ Alternatieve caption" UI (regels 636-652) en bijbehorende state wordt volledig verwijderd. Het `alternative_caption` database veld blijft bestaan maar wordt niet meer gebruikt. Het nieuwe A/B systeem vervangt dit volledig.

### Multi-platform A/B: 1 gedeelde ab_test_id
Alle posts (ongeacht platform) delen dezelfde `ab_test_id`. De vergelijkings-Sheet groepeert op `ab_test_group` ('A' vs 'B') en toont per groep de resultaten per platform. Dit maakt het duidelijk dat A-Instagram en A-Facebook dezelfde variant zijn.

### Caption leercyclus inclusief A/B posts
A/B posts met `operator_edited = true` doen mee in de caption leercyclus. Dit is gewenst gedrag -- de AI leert van elke operator-aanpassing, ongeacht of het een A/B test is.

### A/B resultaten label
"Indicatieve vergelijking" met tooltip: "Organische social media posts hebben te weinig volume voor statistische significantie."

### A/B timing
Alle B-variant posts worden 24 uur na de A-variant ingepland. Operator kan dit handmatig aanpassen.
