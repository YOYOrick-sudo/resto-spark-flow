
# Sessie 3.2 — Instagram Onboarding + Slimme Content Generatie

## Samenvatting

Drie onderdelen: (1) een nieuwe edge function die na Instagram OAuth-koppeling de laatste 30 posts importeert, insights ophaalt, content type classifieert, en een brand analyse triggert; (2) upgrade van de content generatie output met `photo_suggestion` en `content_type`; (3) heranalyse trigger in de sync function. Plus een feedback card op de social posts pagina.

---

## Architectuur

```text
Instagram OAuth koppeling (sessie 2.1)
        |
        v
marketing-onboard-instagram (nieuw)
        |
        +-- Stap 1: Haal 30 posts op via Graph API
        +-- Stap 2: Haal insights per post op
        +-- Stap 3: Classificeer content type per post (AI, batch)
        +-- Stap 4: Trigger marketing-analyze-brand
        |
        v
marketing_social_posts (status='imported') + marketing_brand_intelligence (bijgewerkt)

marketing-sync-social-stats (edit)
        |
        +-- Na sync: check posts_analyzed_since_last_analysis >= 5
        +-- Zo ja: trigger marketing-analyze-brand

marketing-generate-content (edit)
        |
        +-- Output uitgebreid met photo_suggestion + content_type
```

---

## Stap 1: Edge Function — marketing-onboard-instagram

### `supabase/functions/marketing-onboard-instagram/index.ts` (nieuw)

Authenticated endpoint. Getriggerd vanuit de frontend na succesvolle Instagram OAuth koppeling.

**Input:** `{ account_id: string }` (ID uit `marketing_social_accounts`)

**Flow:**

1. Auth check: haal user, lookup employee -> location_id
2. Fetch social account by ID, verificeer `platform === 'instagram'` en `is_active === true`
3. Haal `account_id` (Instagram user ID) en `access_token` op

**Stap 1 — Haal laatste 30 posts op:**
- `GET https://graph.facebook.com/v19.0/{ig-user-id}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&limit=30`
- Per post: insert in `marketing_social_posts` met:
  - `status = 'imported'`
  - `platform = 'instagram'`
  - `external_post_id = media.id`
  - `content_text = media.caption`
  - `media_urls = [media.media_url || media.thumbnail_url]`
  - `published_at = media.timestamp`
  - `analytics = { likes: media.like_count, comments: media.comments_count }`
  - Skip posts die al bestaan (check `external_post_id` uniekheid)

**Stap 2 — Haal insights per post:**
- Per post: `GET https://graph.facebook.com/v19.0/{media-id}/insights?metric=impressions,reach,saved,engagement`
- Merge metrics in `analytics` JSONB
- Rate limit handling: als code 4 of 190, stop insights fetch, ga door met classificatie

**Stap 3 — Content type classificatie (AI, batch):**
- Verzamel alle captions in 1 batch call (max 30)
- System prompt:
```
Classificeer elke Instagram caption in exact 1 van deze categorieën:
food_shot, behind_the_scenes, team, ambiance, seasonal, promo, event, user_generated.
Geef voor elke caption het nummer en de categorie.
```
- Tool calling met array output: `[{ index: number, tag: string }]`
- Update `content_type_tag` per post
- Model: `google/gemini-3-flash-preview` (snel, goedkoop)

**Stap 4 — Trigger brand analyse:**
- HTTP POST naar `marketing-analyze-brand` (interne call via Supabase URL + service role key)
- Fire-and-forget: wacht niet op resultaat

**Error handling:**
- Graph API errors: log en return partial results
- AI classification failure: log, laat `content_type_tag` als null
- Per-post errors: skip en ga door

**Response:** `{ imported: number, insights_fetched: number, classified: number }`

---

## Stap 2: Upgrade marketing-generate-content output

### `supabase/functions/marketing-generate-content/index.ts` (edit)

Uitbreiden van de tool calling schema en prompt voor `generateSocialContent`:

**Nieuwe output velden in tool schema:**
- `photo_suggestion`: string — "Concrete foto-tip op basis van visuele stijl analyse"
- `content_type`: string — het aanbevolen content type tag (food_shot, behind_the_scenes, etc.)

**System prompt aanpassingen:**
- Als `visual_style_profile` beschikbaar: toevoegen "Geef ook een concrete foto-tip (1 zin) die past bij de visuele stijl van dit restaurant."
- Als `engagement_baseline` beschikbaar: toevoegen `"Verwachte performance baseline: gem. bereik {avg_reach}, gem. engagement {avg_engagement}"`
- Als `learning_stage` beschikbaar: gebruik het om de toon van de suggesties aan te passen:
  - `onboarding`: meer generieke best practices
  - `learning`/`optimizing`/`mature`: meer gepersonaliseerd op basis van data

**Tool schema update:**
```json
{
  "photo_suggestion": { "type": "string", "description": "Concrete foto-tip in 1 zin, passend bij de visuele stijl" },
  "content_type": { "type": "string", "description": "Aanbevolen content type: food_shot, behind_the_scenes, team, ambiance, seasonal, promo, event, user_generated" }
}
```

### `src/hooks/useGenerateContent.ts` (edit)

Update `SocialContentResult` interface:
- Voeg `photo_suggestion?: string` toe
- Voeg `content_type?: string` toe

---

## Stap 3: Heranalyse trigger in sync function

### `supabase/functions/marketing-sync-social-stats/index.ts` (edit)

Na de sync loop (na alle posts zijn verwerkt):

1. Per unieke `location_id` in de verwerkte posts:
   - Query `marketing_brand_intelligence` voor `posts_analyzed` en `last_analysis_at`
   - Query `COUNT(*)` van `marketing_social_posts` met `status IN ('published', 'imported')` voor die locatie
   - Als `current_count - posts_analyzed >= 5`:
     - HTTP POST naar `marketing-analyze-brand` (fire-and-forget)
     - Log: "Triggered re-analysis for location {id}"

---

## Stap 4: Frontend — Onboarding trigger + Feedback card

### `src/hooks/useInstagramOnboarding.ts` (nieuw)

```typescript
// useInstagramOnboarding() -> mutation die marketing-onboard-instagram aanroept
// Input: { account_id: string }
// Output: { imported: number, insights_fetched: number, classified: number }
```

### `src/pages/marketing/SocialPostsPage.tsx` (edit)

Feedback card na succesvolle onboarding:

- Query `useBrandIntelligence()` 
- Als `learning_stage !== 'onboarding'` EN er bestaan posts met `status = 'imported'`:
  - Toon `InfoAlert variant="success"` met auto-dismiss (localStorage key `nesto_ig_onboarded_{locationId}`, check of < 7 dagen oud):
    - Tekst: "Instagram gekoppeld -- we kennen nu je stijl en wat het beste werkt. Je suggesties worden elke week beter."
  - Na 7 dagen of handmatige dismiss: niet meer tonen

### Trigger punt:
De onboarding wordt getriggerd vanuit de Instagram koppeling flow (settings pagina). Na succesvolle OAuth + account opslag, roep `useInstagramOnboarding.mutate({ account_id })` aan. Dit is een edit in de bestaande marketing settings component waar Instagram gekoppeld wordt.

---

## Stap 5: config.toml update

### `supabase/config.toml` (edit)

```toml
[functions.marketing-onboard-instagram]
verify_jwt = false
```

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| `supabase/functions/marketing-onboard-instagram/index.ts` | Nieuw: Instagram import + classificatie + analyse trigger |
| `supabase/functions/marketing-generate-content/index.ts` | Edit: photo_suggestion + content_type in output |
| `supabase/functions/marketing-sync-social-stats/index.ts` | Edit: heranalyse trigger na sync |
| `supabase/config.toml` | Edit: nieuwe function config |
| `src/hooks/useGenerateContent.ts` | Edit: uitgebreide SocialContentResult interface |
| `src/hooks/useInstagramOnboarding.ts` | Nieuw: onboarding mutation hook |
| `src/pages/marketing/SocialPostsPage.tsx` | Edit: feedback card |

---

## Technische details

### Instagram Graph API paginatie
De `limit=30` parameter haalt maximaal 30 posts op in 1 call. Geen paginatie nodig voor v1.

### Content type classificatie — batch approach
Alle 30 captions in 1 AI call (goedkoper dan 30 losse calls). De AI retourneert een array met index + tag. Dit voorkomt 30 afzonderlijke API calls.

### Heranalyse drempel
De drempel van 5 nieuwe posts voorkomt onnodige AI calls. Bij een actief restaurant dat 3-5x per week post, triggert dit ongeveer elke 1-2 weken een heranalyse bovenop de wekelijkse cron.

### Geen database wijzigingen
Alle benodigde kolommen bestaan al: `marketing_social_posts.content_type_tag`, `marketing_social_posts.external_post_id`, `marketing_social_posts.analytics`, `marketing_brand_intelligence.*`.

---

## Wat NIET in deze sessie

- Facebook/Google Business onboarding (alleen Instagram)
- Carousel/reels specifieke insights
- Handmatige herclassificatie van content types
- UI voor brand intelligence data weergave
- Weekplan generatie (sessie 3.3+)
