

# Sessie 4.1 -- Brand Intelligence Dashboard + Geavanceerde Analytics

## Samenvatting

Drie onderdelen: (1) BrandIntelligenceCard op het marketing dashboard, (2) uitbreiding van Marketing en Social analytics tabs met revenue-attributie en content performance, (3) nieuwe Reviews analytics tab. Geen database migraties nodig -- alle data zit in bestaande tabellen.

---

## Deel 1: BrandIntelligenceCard op Dashboard

### Nieuw bestand: `src/components/marketing/dashboard/BrandIntelligenceCard.tsx`

Component dat `marketing_brand_intelligence` data visueel toont:

**Props:** `data` (brand intelligence row of null), `isLoading` (boolean)

**Layout:**
- NestoCard, header "AI Intelligentie" met `Brain` icon (lucide-react)
- Learning stage progress: 4 stappen horizontaal verbonden met lijn
  - Stappen: Onboarding, Learning, Optimizing, Mature
  - Huidige stap + voorgaande in `bg-primary`, toekomstige in `bg-muted`
  - Labels onder elke stap in `text-xs text-muted-foreground`

**Conditionele content:**
- `learning_stage === 'onboarding'`: InfoAlert "Post meer content om de AI te trainen. Na 5 posts leert de AI je stijl."
- Anders: compact overzicht met:
  - "Posts geanalyseerd: {posts_analyzed}" -- `text-muted-foreground`
  - "Sterkste content type: {weekly_best_content_type}" -- NestoBadge
  - "Optimale posttijden:" -- top 3 uit `optimal_post_times` JSON array, geformatteerd als "Di 11:30, Do 18:00, Za 12:00"
  - "Google score: {google_rating}/5 ({google_review_count} reviews)" -- alleen als aanwezig in `engagement_baseline` JSON
- Stijlprofielen (caption_style_profile, visual_style_profile, review_response_profile) worden NIET getoond

### Edit: `src/pages/marketing/MarketingDashboard.tsx`

- Import BrandIntelligenceCard
- Render na CoachingTipsCard (regel 85), voor KPI tiles grid (regel 88)
- Props: `data={intelligence}` `isLoading={intelligenceLoading}` -- beide al beschikbaar via bestaande `useBrandIntelligence()` call op regel 45

---

## Deel 2: Marketing Analytics Tab uitbreiding

### Edit: `src/hooks/useMarketingAnalytics.ts`

Drie nieuwe queries toevoegen:

1. **revenueWeeklyQuery**: Haal alle `marketing_campaign_analytics` op voor locatie, groepeer client-side per ISO week (date-fns `startOfWeek`), som `revenue_attributed` per week, laatste 12 weken
2. **activeContactsQuery**: `marketing_contact_preferences` COUNT WHERE `opted_in = true` AND `location_id`
3. **campaignDetailQuery**: `marketing_campaign_analytics` met alle kolommen inclusief `bounced_count`, joined met `marketing_campaigns.name` en `sent_at`, laatste 90 dagen

Return object uitbreiden met: `revenueWeekly`, `activeContacts`, `campaignDetail`

### Edit: `src/pages/analytics/tabs/MarketingAnalyticsTab.tsx`

Na de bestaande "Campagne prestaties" sectie, twee nieuwe secties toevoegen:

**Revenue Impact sectie:**
- Section header "Revenue Impact"
- 3 StatCards in grid (`grid-cols-3`):
  - "Marketing revenue" -- SUM revenue_attributed (al beschikbaar via bestaande `revenue` query, hergebruiken)
  - "Revenue per campagne" -- gemiddelde (total / campaign count)
  - "Actieve contacten" -- uit nieuwe activeContactsQuery
- LineChart: revenue per week (laatste 12 weken), primary color lijn
- Empty state: "Verstuur je eerste campagne om revenue impact te meten."

**Email Performance Detail sectie:**
- Section header "Email Performance"
- NestoTable met uitgebreide campagne data (bounced_count kolom toegevoegd)
- Kolommen: Naam, Verzonden, Geopend (%), Geklikt (%), Bounced, Revenue
- Muted text styling voor 0-waarden

---

## Deel 3: Social Analytics Tab uitbreiding

### Edit: `src/pages/analytics/tabs/SocialAnalyticsTab.tsx`

Na de bestaande "Post prestaties" tabel, twee nieuwe secties:

**Content Prestaties per Type:**
- Import en gebruik `useBrandIntelligence()` (bestaande hook)
- NestoCard met section header
- Horizontale BarChart (`layout="vertical"`, Recharts) 
- Data: parse `content_type_performance` JSON -- verwachte structuur: `{ "behind_the_scenes": { "avg_engagement": 45, "post_count": 8 }, ... }`
- Bars in primary color, gesorteerd op avg_engagement desc
- EmptyState als geen data

**Top Hashtags:**
- NestoCard met section header
- Data: parse `top_hashtag_sets` JSON
- Chip-achtige weergave: `bg-primary/10 text-primary rounded-full px-3 py-1 text-sm`
- UITooltip per hashtag met avg_engagement
- Max 15, gesorteerd op performance

---

## Deel 4: Reviews Analytics Tab (nieuw)

### Edit: `src/pages/analytics/AnalyticsPage.tsx`

- Voeg `{ id: 'reviews', label: 'Reviews' }` toe aan TABS array na 'social' (voor 'reservations')
- Verwijder `disabled: true` niet van reservations/kitchen
- Import en render `ReviewsAnalyticsTab` bij `activeTab === 'reviews'`

### Nieuw bestand: `src/hooks/useReviewAnalytics.ts`

Hook `useReviewAnalytics(periodDays: number)`:
- Query `marketing_reviews` voor locatie, gefilterd op `published_at` binnen periode
- Client-side berekeningen:
  - Sentiment trend: groepeer per week, tel positive/neutral/negative per week
  - Rating verdeling: tel per rating (5,4,3,2,1)
  - Response rate: reviews met `responded_at` IS NOT NULL / totaal
  - Gemiddeld sentiment: positive=3, neutral=2, negative=1, gemiddelde
- Hergebruik `useBrandIntelligence()` voor Google score/count uit `engagement_baseline`

### Nieuw bestand: `src/pages/analytics/tabs/ReviewsAnalyticsTab.tsx`

Layout:
- Periode selector: NestoOutlineButtonGroup 30/90/365 dagen
- 4 StatCards in grid:
  - Google score (uit engagement_baseline.google_rating)
  - Totaal reviews (uit engagement_baseline.google_review_count)
  - Response rate (%)
  - Gemiddeld sentiment score
- Sentiment trend LineChart: 3 lijnen per week
  - Positive: `hsl(var(--success))` (groen)
  - Neutral: `hsl(var(--muted-foreground))` (grijs)
  - Negative: `hsl(var(--error))` (rood)
- Rating verdeling: horizontale bars 5-4-3-2-1 sterren
  - Progress component met custom styling per rating
  - Toon count + percentage per rating

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| `src/components/marketing/dashboard/BrandIntelligenceCard.tsx` | Nieuw |
| `src/pages/marketing/MarketingDashboard.tsx` | Edit: BrandIntelligenceCard na CoachingTipsCard |
| `src/hooks/useMarketingAnalytics.ts` | Edit: revenueWeekly + activeContacts + campaignDetail queries |
| `src/pages/analytics/tabs/MarketingAnalyticsTab.tsx` | Edit: revenue impact + email detail secties |
| `src/pages/analytics/tabs/SocialAnalyticsTab.tsx` | Edit: content type perf + hashtags secties |
| `src/hooks/useReviewAnalytics.ts` | Nieuw |
| `src/pages/analytics/tabs/ReviewsAnalyticsTab.tsx` | Nieuw |
| `src/pages/analytics/AnalyticsPage.tsx` | Edit: Reviews tab toevoegen |

## Geen database migratie nodig

Alle benodigde data zit in bestaande tabellen:
- `marketing_brand_intelligence` (learning_stage, content_type_performance, optimal_post_times, top_hashtag_sets, engagement_baseline, weekly_best_content_type, posts_analyzed)
- `marketing_campaign_analytics` (revenue_attributed, bounced_count, etc.)
- `marketing_contact_preferences` (opted_in)
- `marketing_reviews` (rating, sentiment, responded_at, published_at)

## Technische details

**Learning stage mapping:** onboarding=0, learning=1, optimizing=2, mature=3. Progress visueel als 4 connected circles met labels.

**Content type performance JSON:** Verwachte structuur `{ "type_name": { "avg_engagement": number, "post_count": number } }`. Parse met `Object.entries()`, sorteer op avg_engagement, map naar BarChart data.

**Revenue weekly groepering:** Client-side via date-fns `startOfWeek()` + `format()`. Geen database functie nodig.

**Reviews sentiment scoring:** Simpele mapping positive=3, neutral=2, negative=1. Gemiddelde over alle reviews in de periode.

**Google rating bron:** Uit `engagement_baseline.google_rating` en `.google_review_count` (JSON velden in marketing_brand_intelligence), niet uit individuele marketing_reviews records.

**Revenue empty state:** Als er geen campaign analytics data is (alle totalen = 0), toon: "Verstuur je eerste campagne om revenue impact te meten." in plaats van 0-waarden.

