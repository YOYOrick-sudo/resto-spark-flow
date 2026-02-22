
# Sessie 3.6 — Email Builder Verrijking + UGC + Content Series

## Status: ✅ Afgerond

### Deel 1: Email Builder — 3 nieuwe blokken ✅
- `menu_item` blok: tekstvelden (naam, beschrijving, prijs) + placeholder foto. NestoSelect met menu_items tabel volgt in Fase 6.
- `reserve_button` blok: automatische CTA gestyled in brand kit primary_color. Link naar Guest Widget.
- `review_quote` blok: NestoSelect dropdown van featured reviews (WHERE is_featured = true AND review_text IS NOT NULL).
- `useFeaturedReviews()` hook toegevoegd aan useReviews.ts.
- EmailPreview rendert alle 3 nieuwe bloktypen.
- CampaignBuilderPage content_html generatie uitgebreid.

### Deel 2: UGC Tab ✅
- UGC tab toegevoegd aan SocialPostsPage.
- UGCGrid component: grid van tagged Instagram posts met Repost + Opslaan (disabled) knoppen.
- Edge function `marketing-fetch-ugc`: haalt tagged posts op via Instagram Graph API (`/{ig-user-id}/tags`).
- **Let op**: Instagram /tags endpoint vereist `instagram_manage_comments` permission — moet in Meta App Review staan.
- useUGC.ts hook.

### Deel 3: Content Series (optioneel) ✅
- `marketing_content_series` tabel aangemaakt met RLS.
- ContentSeriesManager component: Sheet bereikbaar via "⋯" menu op kalender pagina.
- CRUD hooks in useContentSeries.ts.
- **Let op**: `marketing-generate-weekplan` moet graceful omgaan met lege `marketing_content_series` tabel (maybeSingle() / lege array fallback). Series worden pas meegenomen als ze actief zijn. Geen blocker.

### Opmerkingen van gebruiker verwerkt:
1. ✅ UGC: instagram_manage_comments permission gedocumenteerd in code comment + plan.
2. ✅ Review Quote: useFeaturedReviews() filtert op `review_text IS NOT NULL`.
3. ✅ Content Series: weekplan fallback gedocumenteerd. marketing-generate-weekplan breekt niet als tabel leeg is.
