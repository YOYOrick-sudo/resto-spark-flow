

# Sessie 3.5 — Review Management + MarketingSignalProvider

## Samenvatting

Vier onderdelen: (1) `marketing_reviews` tabel, (2) `marketing-sync-reviews` edge function die elke 6 uur reviews ophaalt met sentiment analyse en AI-responses, (3) volledige reviews UI op `/marketing/reviews` met inbox + stats, en (4) MarketingSignalProvider met 6 signals. Plus een "Review Platforms" tab in marketing settings en cross-module badges.

---

## Architectuur

```text
pg_cron (elke 6 uur)
        |
        v
marketing-sync-reviews (edge function)
        |
        +-- Google Places API: rating + user_ratings_total (betrouwbare aggregaten)
        +-- Google Places API: reviews (max 5, wisselend)
        +-- Per nieuwe review: INSERT (dedup via SHA-256 hash)
        +-- Sentiment analyse (google/gemini-2.5-flash, batch)
        +-- Rating <= 3: genereer ai_suggested_response
        |
        v
marketing_reviews tabel

evaluate-signals (bestaand)
        |
        +-- marketingProvider (nieuw, 6 signals)
```

---

## Feedback verwerkt

### 1. Google Places API max 5 reviews
Google roteert welke 5 reviews worden teruggegeven. Twee maatregelen:
- Haal `rating` en `user_ratings_total` op uit de Places API (`fields=rating,user_ratings_total,reviews`) en sla deze op in `marketing_brand_intelligence` als `google_rating` en `google_review_count` (bestaande JSONB kolom `engagement_baseline` of nieuw veld). Dit zijn de betrouwbare aggregaten.
- De review stats op de UI tonen:
  - **Google score** en **totaal reviews**: uit Places API aggregaten (betrouwbaar)
  - **Recente reviews**: uit `marketing_reviews` tabel (sample, niet volledig)
  - UI label: "Recente reviews" in plaats van "Totaal reviews deze maand"

### 2. external_review_id als SHA-256 hash
In plaats van `author_name + time` wordt een SHA-256 hash gebruikt van `author_name + review_text + time`. Dit is robuuster:
- Voorkomt collisions bij gelijke namen
- Onafhankelijk van timestamp formatting wijzigingen
- Implementatie: `crypto.subtle.digest('SHA-256', ...)` in Deno

### 3. google_place_id + tripadvisor_url op locations
Al aanwezig in de `locations` tabel. Geen migratie nodig. De Review Platforms settings tab kan direct `locations` updaten.

---

## Stap 1: Database -- marketing_reviews tabel

### SQL Migration

```sql
CREATE TABLE public.marketing_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  external_review_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  author_photo_url TEXT,
  rating INTEGER NOT NULL,
  review_text TEXT,
  review_language TEXT DEFAULT 'nl',
  published_at TIMESTAMPTZ,
  sentiment TEXT DEFAULT 'neutral',
  sentiment_aspects JSONB DEFAULT '{}',
  ai_suggested_response TEXT,
  response_text TEXT,
  responded_at TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, platform, external_review_id)
);

-- RLS
ALTER TABLE public.marketing_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY reviews_select ON public.marketing_reviews
  FOR SELECT USING (user_has_location_access(auth.uid(), location_id));

CREATE POLICY reviews_insert ON public.marketing_reviews
  FOR INSERT WITH CHECK (user_has_role_in_location(auth.uid(), location_id,
    ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY reviews_update ON public.marketing_reviews
  FOR UPDATE USING (user_has_role_in_location(auth.uid(), location_id,
    ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY reviews_delete ON public.marketing_reviews
  FOR DELETE USING (user_has_role_in_location(auth.uid(), location_id,
    ARRAY['owner'::location_role, 'manager'::location_role]));

-- Validatie trigger
CREATE OR REPLACE FUNCTION public.validate_marketing_review()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.sentiment NOT IN ('positive', 'neutral', 'negative') THEN
    RAISE EXCEPTION 'Invalid sentiment';
  END IF;
  IF NEW.platform NOT IN ('google', 'tripadvisor') THEN
    RAISE EXCEPTION 'Invalid platform';
  END IF;
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Invalid rating';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_marketing_review
  BEFORE INSERT OR UPDATE ON public.marketing_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_marketing_review();
```

---

## Stap 2: Edge Function -- marketing-sync-reviews

### `supabase/functions/marketing-sync-reviews/index.ts` (nieuw)

Service role, `verify_jwt = false`. pg_cron elke 6 uur.

**Flow per locatie (met `google_place_id`):**

1. Query locaties met `google_place_id IS NOT NULL`
2. Per locatie:
   - `GET https://maps.googleapis.com/maps/api/place/details/json?place_id={id}&fields=rating,user_ratings_total,reviews&key={GOOGLE_PLACES_API_KEY}`
   - Sla `rating` en `user_ratings_total` op in `marketing_brand_intelligence.engagement_baseline` (merge in bestaande JSONB: `{ ...existing, google_rating: 4.5, google_review_count: 127 }`)
3. Per review in response:
   - Genereer `external_review_id` = SHA-256 hash van `author_name + text + time`
   - Check of hash al bestaat (UNIQUE constraint vangt duplicaten)
   - INSERT nieuwe reviews met `platform = 'google'`
4. Sentiment analyse batch (google/gemini-2.5-flash):
   - Alle nieuwe reviews met tekst in 1 AI call
   - Output per review: `sentiment` + `sentiment_aspects` (food, service, ambiance)
5. Reviews met `rating <= 3`: genereer `ai_suggested_response`
   - Gebruik brand intelligence `caption_style_profile` als beschikbaar voor brand voice
   - Prompt: empathisch, professioneel, erken probleem, bied oplossing, nodig uit terug te komen

**Secret vereist:** `GOOGLE_PLACES_API_KEY`

**Error handling:**
- Geen Google Place ID: skip locatie
- API errors: log, ga door met volgende locatie
- AI failures: log, laat sentiment als 'neutral'
- Duplicate insert (23505): skip silently

---

## Stap 3: Reviews UI -- /marketing/reviews

### `src/pages/marketing/ReviewsPage.tsx` (nieuw)

Route: `/marketing/reviews`

**Layout:**
- PageHeader: "Reviews" met subtitle "Beheer en beantwoord je reviews"

**Stats sectie (bovenaan, 4 StatCards):**
- Gemiddelde score: uit `engagement_baseline.google_rating` (Places API aggregaat)
- Totaal reviews: uit `engagement_baseline.google_review_count` (Places API aggregaat)
- Response rate: berekend uit `marketing_reviews` (responded / total * 100)
- Sentiment verdeling: positive/neutral/negative counts uit `marketing_reviews`
- Rating verdeling: 5-4-3-2-1 horizontale balken uit `marketing_reviews`

**Filters:**
- Platform (NestoSelect: Google, TripAdvisor)
- Rating (1-5)
- Beantwoord/onbeantwoord
- Sentiment

**NestoTable met kolommen:**
- Auteur (font-medium)
- Rating (sterren iconen)
- Tekst (truncated, line-clamp-2)
- Datum (formatDistanceToNow)
- Sentiment (NestoBadge: positive=success, neutral=default, negative=error)
- Platform (NestoBadge)
- Status: beantwoord/onbeantwoord icoon

**Klik op rij: Sheet (detail panel):**
- Volledige review tekst
- Sentiment aspects als badges
- AI response suggestie (als beschikbaar, of "Laden" knop)
- Textarea voor antwoord (pre-filled met AI suggestie)
- "Opslaan" knop (slaat response_text op in DB; Google reply API buiten scope)
- "Feature" toggle (is_featured)

### `src/hooks/useReviews.ts` (nieuw)

- `useReviews(filters)`: query `marketing_reviews` met filters
- `useReviewStats()`: aggregated stats uit `marketing_reviews` + `engagement_baseline`
- `useUpdateReview()`: mutation voor `response_text`, `is_featured`, `responded_at`
- `useGenerateReviewResponse()`: on-demand AI response via `marketing-generate-content` of inline edge function call

---

## Stap 4: Marketing Settings -- Review Platforms tab

### `src/components/marketing/settings/ReviewPlatformsTab.tsx` (nieuw)

8e tab in `/instellingen/marketing`.

**Inhoud:**
- NestoCard met twee invoervelden:
  - Google Place ID (NestoInput, help tooltip: "Te vinden in Google Maps URL")
  - TripAdvisor URL (NestoInput)
- Opslaan knop: UPDATE `locations` SET `google_place_id`, `tripadvisor_url`
- Toast: "Review platforms opgeslagen"

### `src/pages/marketing/MarketingSettings.tsx` (edit)

- Voeg 8e tab toe: `{ id: 'reviews', label: 'Review Platforms' }`
- Import en render `ReviewPlatformsTab`

---

## Stap 5: MarketingSignalProvider

### `supabase/functions/evaluate-signals/index.ts` (edit)

Nieuwe `marketingProvider: SignalProvider` toevoegen aan `providers` array (regel 684).

**Entitlement helper:**
```typescript
async function hasMarketingEntitlement(locationId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('location_entitlements')
    .select('id')
    .eq('location_id', locationId)
    .eq('module_key', 'marketing')
    .eq('enabled', true)
    .maybeSingle();
  return !!data;
}
```

**6 signals:**

| Signal | Severity | Logica | Cooldown |
|---|---|---|---|
| `marketing_negative_review` | warning | EXISTS marketing_reviews WHERE rating <= 2 AND response_text IS NULL AND created_at > now() - interval '7 days' | 24h |
| `marketing_unscheduled_week` | info | COUNT marketing_social_posts WHERE status = 'scheduled' AND scheduled_at BETWEEN now() AND now() + 7 days < 3 | 72h |
| `marketing_engagement_dropping` | warning | Gem. engagement recente 2 weken < 0.8x engagement_baseline.avg_engagement | 168h |
| `marketing_review_score_declining` | warning | Gem. rating reviews laatste 30 dagen < gem. rating 30-60 dagen geleden, verschil >= 0.3 | 168h |
| `marketing_at_risk_guests` | info | COUNT marketing_contact_preferences met opted_in = true, gekoppeld aan customers met days_since_last_visit >= 60 en total_visits >= 2 > 10 | 72h |
| `marketing_email_open_rate_declining` | warning | Gem. open rate laatste 3 campagnes < gem. vorige 3 (via marketing_campaign_analytics) | 168h |

**resolveStale:**
- `marketing_negative_review`: resolve als geen onbeantwoorde reviews met rating <= 2
- `marketing_unscheduled_week`: resolve als >= 3 posts ingepland
- Overige: cooldown-based

---

## Stap 6: Cross-module badges + routing

### `src/components/marketing/dashboard/ContentIdeasSection.tsx` (edit)

Uitbreiden SOURCE_BADGE mapping:
```typescript
kitchen: { label: 'Keuken', variant: 'warning' },
menu_card: { label: 'Menu', variant: 'success' },
reservations: { label: 'Reserveringen', variant: 'primary' },
```

### `src/lib/navigation.ts` (edit)

Voeg "Reviews" toe als subitem onder marketing:
```typescript
{ id: 'marketing-reviews', label: 'Reviews', path: '/marketing/reviews' },
```

En in de path mapping:
```typescript
'marketing-reviews': '/marketing/reviews',
```

### `src/App.tsx` (edit)

Voeg route toe:
```typescript
<Route path="/marketing/reviews" element={<ReviewsPage />} />
```

### `supabase/config.toml` (edit -- automatisch)

```toml
[functions.marketing-sync-reviews]
verify_jwt = false
```

### pg_cron job

```sql
SELECT cron.schedule(
  'marketing-sync-reviews-6h',
  '0 */6 * * *',
  $$ SELECT net.http_post(...) $$
);
```

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| SQL Migration | Nieuw: marketing_reviews tabel + RLS + validatie trigger |
| `supabase/functions/marketing-sync-reviews/index.ts` | Nieuw: review sync + sentiment + AI response |
| `supabase/functions/evaluate-signals/index.ts` | Edit: marketingProvider (6 signals) toevoegen |
| `supabase/config.toml` | Edit: nieuwe function config |
| pg_cron SQL | Nieuw: elke 6 uur sync job |
| `src/pages/marketing/ReviewsPage.tsx` | Nieuw: reviews inbox + stats UI |
| `src/hooks/useReviews.ts` | Nieuw: reviews query + mutations + stats |
| `src/components/marketing/settings/ReviewPlatformsTab.tsx` | Nieuw: review platform settings |
| `src/pages/marketing/MarketingSettings.tsx` | Edit: 8e tab toevoegen |
| `src/components/marketing/dashboard/ContentIdeasSection.tsx` | Edit: cross-module badges |
| `src/lib/navigation.ts` | Edit: Reviews sidebar item |
| `src/App.tsx` | Edit: /marketing/reviews route |

---

## Technische details

### Google Places API -- betrouwbare aggregaten
De Places API retourneert `rating` (overall score) en `user_ratings_total` (totaal aantal reviews) als betrouwbare aggregaten los van de 5 individuele reviews. Deze worden opgeslagen in `marketing_brand_intelligence.engagement_baseline` en gebruikt voor de dashboard stats. De individuele reviews in `marketing_reviews` worden gelabeld als "Recente reviews" in de UI.

### external_review_id -- SHA-256 hash
`crypto.subtle.digest('SHA-256', encoder.encode(author_name + text + time))` in Deno. Hex-encoded. Robuuster dan string concatenatie: onafhankelijk van formatting, geen collision bij gelijke namen.

### Sentiment analyse model
`google/gemini-2.5-flash` voor nuance bij restaurant reviews. Batch: alle nieuwe reviews in 1 call. Tool calling voor gestructureerde output met `sentiment` en `sentiment_aspects`.

### Google reply API
Buiten scope. De "Opslaan" knop slaat `response_text` op in de database. Toekomstige sessie kan Google My Business API OAuth toevoegen.

### MarketingSignalProvider entitlement
Checkt `location_entitlements` voor `module_key = 'marketing'`. Als niet enabled, worden alle 6 signals overgeslagen.

### Secret vereiste
`GOOGLE_PLACES_API_KEY` nodig voor review sync. Wordt aan de gebruiker gevraagd.

---

## Wat NIET in deze sessie

- Google My Business reply API (antwoorden posten)
- TripAdvisor scraping/API (alleen Google)
- Review notificaties (push/email bij nieuwe review)
- Review analytics trend grafieken
- Automatische review response
