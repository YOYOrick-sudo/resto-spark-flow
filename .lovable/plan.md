
# Sessie 2.5 — Social Analytics + Google Auto-refresh

## Samenvatting

Twee edge functions voor metrics sync en Google post auto-refresh, een Social Analytics tab op de Analytics pagina, een read-only Instagram Grid Preview, en polish items (token expiry banners, empty states, loading skeletons).

**Gebruikersfeedback verwerkt:** Instagram Grid Preview is **read-only** in v1. Geen drag-and-drop — de grid toont alleen hoe je feed eruit zal zien. Volgorde aanpassen doe je via de kalender.

---

## Architectuur

Geen database wijzigingen nodig. `marketing_social_posts.analytics` JSONB is al beschikbaar. `marketing_social_accounts` heeft `token_expires_at` voor expiry detectie.

---

## Stap 1: Edge Function — marketing-sync-social-stats

### `supabase/functions/marketing-sync-social-stats/index.ts` (nieuw)

Triggered via pg_cron elke 4 uur. Service role key, `verify_jwt = false`.

**Flow:**
1. Query published posts met `external_post_id IS NOT NULL` en `published_at > now() - 30 days`
2. Batch account lookups per location+platform
3. Per post, platform-specifieke API calls:
   - **Instagram:** `GET /{media-id}/insights?metric=impressions,reach,saved,engagement`
   - **Facebook:** `GET /{post-id}?fields=insights.metric(post_impressions,post_reach,post_clicks)`
   - **Google Business:** `GET /v4/{localPostName}?readMask=localPostMetrics`
4. Merge metrics in `analytics` JSONB + `last_synced` timestamp
5. Error handling: skip bij rate limit (code 4) of expired token (code 190), log en continue

---

## Stap 2: Edge Function — marketing-refresh-google-posts

### `supabase/functions/marketing-refresh-google-posts/index.ts` (nieuw)

Triggered via pg_cron dagelijks 08:00 UTC. Service role key, `verify_jwt = false`.

**Flow:**
1. Query Google Business posts waar `published_at < now() - interval '6 days'` en `status = 'published'`
2. Per post: fetch active account, DELETE oude post via API, re-CREATE met dezelfde content
3. Update `external_post_id` en `published_at` in database
4. Bij API failure: set `error_message`, status blijft `published`

---

## Stap 3: pg_cron jobs

Twee SQL migrations:

1. **marketing-sync-social-stats** -- `0 */4 * * *` (elke 4 uur)
2. **marketing-refresh-google-posts** -- `0 8 * * *` (dagelijks 08:00 UTC)

Beide via `cron.schedule()` met `net.http_post()` naar de edge function URL.

---

## Stap 4: config.toml update

### `supabase/config.toml` (edit)

Twee nieuwe entries:
```
[functions.marketing-sync-social-stats]
verify_jwt = false

[functions.marketing-refresh-google-posts]
verify_jwt = false
```

---

## Stap 5: Social Analytics hook

### `src/hooks/useMarketingAnalytics.ts` (edit)

Toevoegen aan bestaande hook (nieuwe parameter `includeSocial?: boolean`):

- **`socialMetrics`** query: query `marketing_social_posts` met status `published` over de gekozen periode, aggregate `analytics` JSONB per dag per platform. Return array voor Recharts: `{ date, label, instagram_reach, facebook_reach, google_reach, instagram_engagement, facebook_engagement, google_clicks }`
- **`socialPostPerformance`** query: top posts gesorteerd op engagement (analytics.engagement of analytics.reach). Return: `{ id, platform, content_text, impressions, reach, engagement, published_at }`
- **`bestPostTime`** berekening: analyseer `published_at` van top-10 performing posts, return simpele suggestie string

---

## Stap 6: Social Analytics tab

### `src/pages/analytics/AnalyticsPage.tsx` (edit)

- Voeg `{ id: 'social', label: 'Social' }` toe aan TABS array (tussen marketing en reserveringen)
- Render `SocialAnalyticsTab` wanneer `activeTab === 'social'`

### `src/pages/analytics/tabs/SocialAnalyticsTab.tsx` (nieuw)

Volgt exact het patroon van `MarketingAnalyticsTab`:

**Periode selector:** `NestoOutlineButtonGroup` (7/30/90 dagen)

**Hero metrics:** Grid van 4 `StatCard`s:
- Totaal bereik (som reach uit analytics JSONB)
- Totaal engagement
- Gepubliceerde posts (count)
- Gem. engagement rate (engagement / reach * 100, 1 decimaal)

**Per-platform chart:** `NestoCard` met `LineChart` (Recharts):
- 3 lijnen: Instagram (`#E1306C`), Facebook (`#1877F2`), Google (`#34A853`)
- DataKey: reach per platform per dag
- XAxis met datum labels, YAxis hidden, geen grid
- Tooltip: Nesto stijl (`bg-foreground text-background rounded-lg`)
- Legenda: gekleurde dots boven de chart

**Beste posttijd:** `InfoAlert variant="info"` met timing suggestie
- Tekst: "Op basis van je data: [dag] om [tijd] bereikt de meeste mensen"
- Of: "Post meer om een optimale posttijd te ontdekken" als onvoldoende data

**Post performance tabel:** `NestoTable`:
- Kolommen: Platform (dot + naam), Bericht (truncated, max-w-[250px]), Bereik (tabular-nums), Engagement (tabular-nums), Datum (muted)
- Gesorteerd op engagement desc
- Empty state: "Publiceer je eerste post om prestaties te zien."

**Loading states:** `Skeleton` patroon (h-24 voor StatCards, h-[300px] voor chart, h-48 voor tabel)

---

## Stap 7: Instagram Grid Preview (read-only)

### `src/pages/marketing/SocialPostsPage.tsx` (edit)

Nieuwe sectie boven de posts tabel, zichtbaar wanneer `platformTab === 'all'` of `platformTab === 'instagram'`:

**"Instagram Feed Preview"**
- Titel: `text-h2`
- 3x3 CSS grid (`grid grid-cols-3 gap-1 max-w-[360px]`)
- Data: filter `useAllSocialPosts({ platform: 'instagram' })` op status `published` + `scheduled`, sort op `scheduled_at`/`published_at` desc, neem eerste 9
- Per cel:
  - Als `media_urls[0]`: thumbnail image (`aspect-square object-cover rounded-sm`)
  - Geen media: gradient placeholder (`bg-gradient-to-br from-[#E1306C]/20 to-[#E1306C]/5`) met eerste 2 woorden van caption
  - Hover overlay: caption preview (`text-[10px] bg-black/60 text-white`)
  - Geplande posts: `border border-dashed border-border opacity-70` om visueel onderscheid te maken
- **Geen drag-and-drop** — read-only preview. Volgorde aanpassen via de kalender.

---

## Stap 8: Token expiry banner

### `src/pages/marketing/SocialPostsPage.tsx` (edit)

Boven de NestoTabs, onder PageHeader:
- Query `useMarketingSocialAccounts()` voor `accountsWithStatus`
- Filter op `status === 'expiring'`
- Per expiring account: `InfoAlert variant="warning"`:
  - Titel: "{Platform} verbinding verloopt binnenkort"
  - Description: "Ga naar Instellingen om opnieuw te verbinden."
  - Child: `NestoButton variant="outline" size="sm"` met Settings icon, navigeert naar `/marketing/instellingen`

### `src/pages/marketing/SocialPostCreatorPage.tsx` (edit)

Zelfde banner logic toevoegen boven het formulier.

---

## Stap 9: Empty state — geen gekoppelde accounts

### `src/pages/marketing/SocialPostsPage.tsx` (edit)

Als alle accounts `status === 'disconnected'`:
- Toon `EmptyState`:
  - Titel: "Geen social accounts gekoppeld"
  - Description: "Koppel Instagram, Facebook of Google Business in de marketing instellingen."
  - Action: navigeer naar `/marketing/instellingen`
- Verberg de rest van de pagina (tabs, tabel, grid preview)

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| `supabase/functions/marketing-sync-social-stats/index.ts` | Nieuw |
| `supabase/functions/marketing-refresh-google-posts/index.ts` | Nieuw |
| `supabase/config.toml` | Edit: 2 function configs |
| pg_cron SQL migration | Nieuw: 2 cron jobs |
| `src/hooks/useMarketingAnalytics.ts` | Edit: social metrics queries |
| `src/pages/analytics/AnalyticsPage.tsx` | Edit: social tab |
| `src/pages/analytics/tabs/SocialAnalyticsTab.tsx` | Nieuw |
| `src/pages/marketing/SocialPostsPage.tsx` | Edit: IG grid, token banner, empty state |
| `src/pages/marketing/SocialPostCreatorPage.tsx` | Edit: token expiry banner |

---

## Design compliance

- StatCards: bestaand component met trend indicators
- Chart: LineChart zonder grid/YAxis, Nesto tooltip (bg-foreground text-background rounded-lg)
- Platform kleuren: Instagram #E1306C, Facebook #1877F2, Google #34A853
- NestoTable: tabular-nums voor getallen
- InfoAlert: variant="warning" voor token expiry, variant="info" voor timing suggestie
- EmptyState: standaard component met actie knop
- Skeletons: rounded-2xl, zelfde hoogte als content
- IG Grid: aspect-square cellen, gap-1, max 360px breed, read-only
- Geplande posts in grid: dashed border + opacity om visueel onderscheid te maken

---

## Wat NIET in deze sessie

- Drag-and-drop in IG grid (bewust read-only in v1, kalender is de plek voor volgorde)
- Automatische aggregatie naar marketing_campaign_analytics
- Social listening / mentions tracking
- Competitor analysis
- Carousel/reels metrics
