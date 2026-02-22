

# Marketing Testrapport Fixes

## Overzicht

Vier fixes uit het testrapport, allemaal laag risico.

---

## Fix 1: PLATFORM_COLORS import centraliseren (2 bestanden)

**SocialPostsPage.tsx**
- Verwijder regels 38-42 (inline `PLATFORM_COLORS`)
- Voeg import toe: `import { PLATFORM_COLORS } from '@/lib/platformColors'`

**DayCell.tsx**
- Verwijder regels 6-10 (inline `PLATFORM_COLORS`)
- Voeg import toe: `import { PLATFORM_COLORS } from '@/lib/platformColors'`

---

## Fix 2: config.toml — 8 ontbrekende entries

Voeg toe aan `supabase/config.toml`:

```
[functions.marketing-attribution]
verify_jwt = false

[functions.marketing-publish-social]
verify_jwt = false

[functions.marketing-refresh-tokens]
verify_jwt = false

[functions.marketing-generate-weekplan]
verify_jwt = false

[functions.marketing-generate-coaching]
verify_jwt = false

[functions.marketing-generate-ideas]
verify_jwt = false

[functions.marketing-sync-reviews]
verify_jwt = false

[functions.marketing-fetch-ugc]
verify_jwt = false
```

Let op: `config.toml` wordt automatisch beheerd, maar deze entries zijn nodig om de functies correct te deployen.

---

## Fix 3: Ontbrekende cron jobs registreren

Via een SQL insert (niet via migration tool, want het bevat project-specifieke URL/key):

| Job | Schema | Doel |
|-----|--------|------|
| `marketing-sync-social-stats` | `0 */4 * * *` | Social metrics ophalen elke 4 uur |
| `marketing-refresh-tokens` | `0 3 * * *` | OAuth tokens vernieuwen dagelijks 03:00 |

Beide via `net.http_post` naar de edge function URL.

---

## Fix 4: marketing-evaluate-ab-test — nieuwe edge function + cron

**Edge function** (`supabase/functions/marketing-evaluate-ab-test/index.ts`):
- Query `marketing_social_posts` waar `ab_test_id IS NOT NULL`, `status = 'published'`, en `created_at` ouder dan 48 uur
- Groepeer per `ab_test_id`
- Vergelijk engagement rate (engagement / reach) per variant (A vs B)
- Update winnende post met `ab_test_winner = true` in analytics JSON
- Return samenvatting van geëvalueerde tests

**config.toml entry**: `verify_jwt = false`

**Cron job**: `0 * * * *` (elk uur) via `net.http_post`

---

## Technische details

| Bestand | Actie |
|---------|-------|
| `src/pages/marketing/SocialPostsPage.tsx` | Edit: verwijder inline PLATFORM_COLORS, voeg import toe |
| `src/components/marketing/calendar/DayCell.tsx` | Edit: verwijder inline PLATFORM_COLORS, voeg import toe |
| `supabase/config.toml` | Edit: 8 function entries toevoegen |
| `supabase/functions/marketing-evaluate-ab-test/index.ts` | Nieuw: A/B test evaluatie functie |
| SQL (insert, niet migration) | 3 cron jobs registreren |

Geen database schema wijzigingen. Geen breaking changes.

