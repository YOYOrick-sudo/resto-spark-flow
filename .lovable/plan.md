
# Sessie 3.1 — Brand Intelligence Foundation

## Samenvatting

Een lerend AI-profiel per locatie dat wekelijks analyseert hoe social content presteert. De edge function combineert SQL-analyse (gratis) met AI-gestuurde schrijfstijl- en visuele stijlprofielen. De operator merkt alleen dat suggesties beter worden — het proces is onzichtbaar.

---

## Architectuur

```text
pg_cron (zondag 05:00 UTC)
        |
        v
marketing-analyze-brand (edge function)
        |
        +-- Laag 0: SQL analyse (gratis)
        |   - content_type_performance
        |   - optimal_post_times
        |   - top_hashtag_sets
        |   - engagement_baseline
        |   - posts_analyzed + learning_stage
        |
        +-- Laag 2: Caption stijl (AI)
        |   - Laatste 20 captions -> caption_style_profile
        |
        +-- Laag 2: Visuele stijl (AI + vision, intern)
            - 10 best-presterende foto's -> visual_style_profile
```

Resultaat wordt opgeslagen in `marketing_brand_intelligence` en automatisch meegegeven aan `marketing-generate-content` voor betere content generatie.

---

## Stap 1: Database — marketing_brand_intelligence

### SQL Migration

```sql
CREATE TABLE public.marketing_brand_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  content_type_performance JSONB DEFAULT '{}'::jsonb,
  optimal_post_times JSONB DEFAULT '{}'::jsonb,
  top_hashtag_sets JSONB DEFAULT '[]'::jsonb,
  caption_style_profile TEXT,
  visual_style_profile TEXT,
  engagement_baseline JSONB DEFAULT '{}'::jsonb,
  weekly_best_content_type TEXT,
  learning_stage TEXT NOT NULL DEFAULT 'onboarding',
  posts_analyzed INTEGER NOT NULL DEFAULT 0,
  current_weekplan JSONB,
  last_analysis_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketing_brand_intelligence_location_unique UNIQUE (location_id)
);

ALTER TABLE public.marketing_brand_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY bi_select ON public.marketing_brand_intelligence
  FOR SELECT USING (user_has_location_access(auth.uid(), location_id));

CREATE POLICY bi_insert ON public.marketing_brand_intelligence
  FOR INSERT WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY bi_update ON public.marketing_brand_intelligence
  FOR UPDATE USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
```

Validatie trigger voor `learning_stage`:

```sql
CREATE OR REPLACE FUNCTION public.validate_learning_stage()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.learning_stage NOT IN ('onboarding', 'learning', 'optimizing', 'mature') THEN
    RAISE EXCEPTION 'Invalid learning_stage: must be onboarding, learning, optimizing, or mature';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_learning_stage
  BEFORE INSERT OR UPDATE ON public.marketing_brand_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.validate_learning_stage();
```

---

## Stap 2: Edge Function — marketing-analyze-brand

### `supabase/functions/marketing-analyze-brand/index.ts` (nieuw)

Triggered via pg_cron wekelijks zondag 05:00 UTC. Service role key, `verify_jwt = false`.

**Flow:**

1. Query alle locaties met ten minste 1 published/imported social post
2. Per locatie:

**Laag 0 — SQL analyse (gratis):**

a. **content_type_performance**: Query `marketing_social_posts` WHERE status IN ('published', 'imported') AND analytics IS NOT NULL. Groepeer op `content_type_tag`. Per type: tel posts, bereken gemiddelde `analytics.reach`, `analytics.engagement`, `analytics.impressions`. Output:
```json
{
  "food_shot": { "count": 12, "avg_reach": 450, "avg_engagement": 35 },
  "team": { "count": 5, "avg_reach": 320, "avg_engagement": 28 }
}
```

b. **optimal_post_times**: Groepeer op `EXTRACT(DOW FROM published_at)` + `EXTRACT(HOUR FROM published_at)`. Bereken gemiddelde engagement per dag+uur combinatie. Top 5 slots. Output:
```json
[
  { "day": 4, "hour": 18, "avg_engagement": 42 },
  { "day": 5, "hour": 12, "avg_engagement": 38 }
]
```

c. **top_hashtag_sets**: Unnest `hashtags` array, tel frequentie, correleer met engagement van de post. Top 15 hashtags gesorteerd op gemiddelde engagement. Output:
```json
[
  { "hashtag": "amsterdam", "count": 8, "avg_engagement": 40 },
  { "hashtag": "foodie", "count": 12, "avg_engagement": 35 }
]
```

d. **engagement_baseline**: Bereken overall gemiddelden: avg_reach, avg_engagement, avg_impressions, total_posts.

e. **weekly_best_content_type**: Content type met hoogste avg_engagement.

f. **posts_analyzed**: COUNT van geanalyseerde posts.

g. **learning_stage**: Bepaal op basis van posts_analyzed:
- 0 -> 'onboarding'
- 1-15 -> 'learning'
- 16-50 -> 'optimizing'
- 51+ -> 'mature'

**Laag 2 — Caption stijl (AI, alleen bij >= 5 posts):**

a. Query laatste 20 captions (content_text) gesorteerd op engagement (hoogste eerst)
b. System prompt:
```
Beschrijf de schrijfstijl van dit restaurant in max 100 woorden:
tone, woordkeuze, emoji gebruik, zinslengte, favoriete uitdrukkingen, CTA stijl.
Dit profiel wordt gebruikt om nieuwe captions in exact dezelfde stijl te genereren.
```
c. Call Lovable AI (`google/gemini-3-flash-preview`) met tool calling, return als `caption_style_profile` string
d. Fout? Log en ga door — SQL analyse is het belangrijkst

**Laag 2 — Visuele stijl (AI + vision, alleen bij >= 5 posts met media):**

a. Query 10 best-presterende posts met `media_urls` niet leeg
b. System prompt:
```
Beschrijf de visuele stijl in max 80 woorden: kleurpalet, lichtgebruik,
compositie, achtergronden, food styling. Dit wordt intern gebruikt voor foto-suggesties.
```
c. Call Lovable AI (`google/gemini-3-flash-preview`) met de image URLs als content parts
d. Sla op als `visual_style_profile` — ALLEEN intern, niet in UI
e. Fout? Log en ga door

3. Upsert `marketing_brand_intelligence` per locatie met alle resultaten + `last_analysis_at = now()`

**Error handling:**
- Per-locatie errors: log en ga door naar volgende locatie
- AI failures: log, sla SQL analyse resultaten alsnog op
- Rate limit (429): stop AI calls, SQL resultaten worden alsnog opgeslagen

---

## Stap 3: Content generatie verrijken

### `supabase/functions/marketing-generate-content/index.ts` (edit)

De bestaande content generatie edge function wordt verrijkt met brand intelligence data:

1. Na het laden van brand kit + location, ook `marketing_brand_intelligence` laden voor de locatie
2. Als `caption_style_profile` beschikbaar: toevoegen aan system prompt:
```
Schrijfstijlprofiel (schrijf in EXACT deze stijl):
{caption_style_profile}
```
3. Als `visual_style_profile` beschikbaar: toevoegen aan system prompt (alleen als hint, niet als apart UI element):
```
Visuele stijl hint (voor foto-gerelateerde suggesties):
{visual_style_profile}
```
4. Als `content_type_performance` beschikbaar: toevoegen aan user prompt context:
```
Best presterende content types: {top 3 met avg engagement}
```
5. Als `optimal_post_times` beschikbaar: gebruik als basis voor `suggested_time` en `suggested_day` in plaats van AI-gok
6. Als `top_hashtag_sets` beschikbaar: mee als context voor hashtag suggesties

---

## Stap 4: pg_cron job

Via SQL insert (niet migratie):

```sql
SELECT cron.schedule(
  'marketing-analyze-brand-weekly',
  '0 5 * * 0',  -- zondag 05:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://igqcfxizgtdkwnajvers.supabase.co/functions/v1/marketing-analyze-brand',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Stap 5: Frontend hook

### `src/hooks/useBrandIntelligence.ts` (nieuw)

```typescript
// useBrandIntelligence() -> query marketing_brand_intelligence by location_id
// Returns: learning_stage, posts_analyzed, content_type_performance,
//          optimal_post_times, top_hashtag_sets, engagement_baseline,
//          caption_style_profile, weekly_best_content_type, last_analysis_at
```

Read-only hook. Geen mutations nodig — data wordt alleen door de edge function geschreven.

---

## Stap 6: config.toml update

### `supabase/config.toml` (edit)

```toml
[functions.marketing-analyze-brand]
verify_jwt = false
```

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| SQL Migration | Nieuw: marketing_brand_intelligence tabel + RLS + validatie trigger |
| `supabase/functions/marketing-analyze-brand/index.ts` | Nieuw: wekelijkse analyse edge function |
| `supabase/functions/marketing-generate-content/index.ts` | Edit: verrijk met intelligence data |
| `supabase/config.toml` | Edit: nieuwe function config |
| pg_cron SQL (via insert tool) | Nieuw: wekelijkse cron job |
| `src/hooks/useBrandIntelligence.ts` | Nieuw: read-only query hook |

---

## Technische details

### AI model keuze
- Caption stijl analyse: `google/gemini-3-flash-preview` (snel, goedkoop, text-only)
- Visuele stijl analyse: `google/gemini-3-flash-preview` (ondersteunt vision/image URLs)
- Beide via tool calling voor gestructureerde output

### Learning stage transitie
Automatisch bepaald bij elke analyse run. Geen handmatige interventie nodig. De stage wordt meegegeven aan de content generatie zodat het AI model weet hoeveel het kan leunen op het profiel vs. generieke best practices.

### Geen UI in deze sessie
Brand Intelligence is een backend-only feature in sessie 3.1. De resultaten worden onzichtbaar meegegeven aan content generatie. De operator merkt alleen dat suggesties beter worden. Latere sessies (3.2+) kunnen optioneel een "Inzichten" sectie toevoegen.

---

## Wat NIET in deze sessie

- UI voor brand intelligence data (komt eventueel in latere sessies)
- Coaching tips (sessie 3.2)
- Content series / weekplan generatie (sessie 3.3+)
- Handmatige trigger voor analyse (alleen cron)
- Reviews analyse
