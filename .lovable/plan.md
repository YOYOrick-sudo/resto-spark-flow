
# Sessie 3.3 — Weekplan + Dashboard Upgrade

## Samenvatting

Drie onderdelen: (1) een nieuwe edge function die wekelijks een weekplan genereert op basis van brand intelligence, (2) een prominente weekplan sectie bovenaan het marketing dashboard, en (3) activering van de kalender sidebar met weekplan data en content ideeen.

---

## Architectuur

```text
pg_cron (maandag 06:00 UTC)
        |
        v
marketing-generate-weekplan (edge function)
        |
        +-- Laad brand intelligence profiel
        +-- Laad cross_module_events (actief)
        +-- Laad recente posts (voorkom herhaling)
        +-- Laag 2 (AI): genereer 3-5 posts
        +-- Sla op in marketing_brand_intelligence.current_weekplan
        |
        v
Marketing Dashboard                    Kalender Sidebar
+---------------------------+          +-------------------+
| Weekplan card (bovenaan)  |          | Weekplan posts    |
| - Per post: dag+tijd,     |          | Auto-fill knop    |
|   platform, caption,      |          | Content ideeen    |
|   content type badge      |          +-------------------+
| - "Alles inplannen" knop  |
| - "Aanpassen" knop        |
+---------------------------+
```

---

## Stap 1: Edge Function — marketing-generate-weekplan

### `supabase/functions/marketing-generate-weekplan/index.ts` (nieuw)

Triggered via pg_cron maandag 06:00 UTC. Service role key, `verify_jwt = false`.

**Flow:**

1. Query alle locaties met een `marketing_brand_intelligence` record
2. Per locatie:
   a. Laad `marketing_brand_intelligence` (optimal_post_times, content_type_performance, caption_style_profile, visual_style_profile, learning_stage, top_hashtag_sets)
   b. Laad laatste 10 `marketing_social_posts` (voorkom herhaling van content type en onderwerp)
   c. Laad actieve `cross_module_events` voor de locatie (expires_at > now())
   d. Bepaal kalender context: huidige week, seizoen, Nederlandse feestdagen in de komende 7 dagen

3. AI call (Laag 2, `google/gemini-3-flash-preview`):

**System prompt:**
```
Je bent een social media planner voor een horecabedrijf.
Genereer een weekplan met 3-5 posts voor de komende week.

{als caption_style_profile: "Schrijf in deze stijl: {profiel}"}
{als visual_style_profile: "Suggereer foto's in deze stijl: {profiel}"}

Per post geef je:
- day: dag van de week (maandag t/m zondag)
- time: optimale posttijd (HH:MM)
- platform: instagram, facebook, of google_business
- content_type: food_shot, behind_the_scenes, team, ambiance, seasonal, promo, event, user_generated
- caption: concept caption (max 2 zinnen)
- hashtags: 5-8 hashtags
- photo_suggestion: concrete foto-tip (1 zin)

Regels:
- Wissel content types af (niet 2x hetzelfde type achter elkaar)
- Focus op best presterende types maar varieer
- Gebruik de optimale posttijden als beschikbaar
- Vermijd herhaling van recente posts
```

**User prompt context:**
```
Restaurant: {naam}
Learning stage: {stage}
Best presterende content types: {top 3}
Optimale posttijden: {lijst}
Recente posts (vermijd herhaling): {laatste 5 captions samengevat}
Cross-module events: {lijst van actieve events, bijv. "empty_shift_detected: dinsdag lunch", "new_menu_item_added: Tonijn Tataki"}
Kalender: Week van {datum}, seizoen: {seizoen}, feestdagen: {lijst of "geen"}
```

Als `learning_stage === 'onboarding'`: genereer generiek plan op basis van best practices (geen stijlprofiel, geen performance data).

**Tool calling schema:**
```json
{
  "name": "return_weekplan",
  "parameters": {
    "posts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "day": { "type": "string" },
          "time": { "type": "string" },
          "platform": { "type": "string" },
          "content_type": { "type": "string" },
          "caption": { "type": "string" },
          "hashtags": { "type": "array", "items": { "type": "string" } },
          "photo_suggestion": { "type": "string" }
        },
        "required": ["day", "time", "platform", "content_type", "caption", "hashtags", "photo_suggestion"]
      }
    }
  }
}
```

4. Upsert `marketing_brand_intelligence.current_weekplan` met het resultaat + `updated_at = now()`

**Error handling:**
- Per-locatie errors: log en ga door
- AI failures: log, current_weekplan wordt niet overschreven
- Rate limit: stop AI calls voor resterende locaties

---

## Stap 2: Dashboard — Weekplan Card

### `src/components/marketing/dashboard/WeekplanCard.tsx` (nieuw)

Prominente sectie BOVENAAN het marketing dashboard, voor de KPI tiles.

**Design:**
- `NestoCard` met subtiele accent border (`border-primary/20`)
- Header: "Je weekplan staat klaar" met kalender icoon
- Subtitle: "Week van {maandag datum}" in `text-muted-foreground`

**Per post rij:**
- Dag + tijd (bijv. "Di 11:30") — `text-sm font-medium tabular-nums` + `text-muted-foreground`
- Platform icoon (Instagram/Facebook/Google) — 16px icoon
- Concept caption — `text-sm truncate` (max 2 regels via `line-clamp-2`)
- Content type — `NestoBadge variant="default" size="sm"`
- Photo suggestion in tooltip on hover

**Twee knoppen (footer):**
- "Alles inplannen" (NestoButton variant="primary" size="sm"):
  - INSERT alle posts als `status: 'scheduled'` in `marketing_social_posts`
  - Toast: "X posts ingepland voor deze week"
  - Card verdwijnt (of toont success state)
- "Aanpassen" (NestoButton variant="outline" size="sm"):
  - INSERT alle posts als `status: 'draft'` in `marketing_social_posts`
  - Navigate naar `/marketing/kalender`

**Empty/loading states:**
- Als `current_weekplan` null of leeg: niet tonen
- Als loading: Skeleton

**Hook:** `useBrandIntelligence()` (bestaand) — leest `current_weekplan`

### `src/pages/marketing/MarketingDashboard.tsx` (edit)

- Import en render `WeekplanCard` bovenaan, voor de KPI grid
- Props: `weekplan` data uit `useBrandIntelligence()`

---

## Stap 3: Dashboard — Content Ideeen Upgrade

### `src/components/marketing/dashboard/ContentIdeasSection.tsx` (nieuw)

Nieuwe sectie onder de KPI tiles, vervangt/upgrade de statische ideeen.

**Data bron:** Query `marketing_content_ideas` WHERE `status = 'active'` ORDER BY `priority DESC` LIMIT 5

**Per idee kaart:**
- Titel (bold) + beschrijving (1 regel, muted)
- Bron badge: `NestoBadge` ("AI", "Menukaart", "Seizoen", "Cross-module")
- Als gepersonaliseerd (brand intelligence beschikbaar): extra label bijv. "Dit type scoort het best bij jou"
- "Maak post" knop → navigate naar `/marketing/social/nieuw?idea={id}&content_type={type}`

**Hook:** `useContentIdeas()` (nieuw) — query `marketing_content_ideas` by location_id

### `src/hooks/useContentIdeas.ts` (nieuw)

```typescript
// useContentIdeas() -> query marketing_content_ideas
// WHERE location_id = currentLocation.id AND status = 'active'
// ORDER BY priority DESC LIMIT 5
```

---

## Stap 4: Kalender Sidebar Activering

### `src/components/marketing/calendar/CalendarSidebar.tsx` (edit)

De placeholder InfoAlerts worden vervangen door werkende secties:

**Weekplan sectie:**
- Laad `current_weekplan` uit `useBrandIntelligence()`
- Per post: dag + tijd, platform icoon, caption (truncated)
- "Auto-fill week" knop: INSERT alle weekplan posts als `status: 'draft'` in `marketing_social_posts`, invalidate query, toast "Weekplan als concepten toegevoegd"

**Content ideeen sectie:**
- Laad `marketing_content_ideas` (top 3, status = 'active')
- Per idee: titel + "Maak post" link

### Wijzigingen:
- Vervang InfoAlert "Wordt slim in Sprint 3" door werkende content ideeen lijst
- Vervang InfoAlert "Beschikbaar na Instagram koppeling" door werkende weekplan lijst
- Beide met graceful fallback als data niet beschikbaar (toon oorspronkelijke InfoAlert)

---

## Stap 5: Weekplan Insert Logic

### `src/hooks/useScheduleWeekplan.ts` (nieuw)

```typescript
// useScheduleWeekplan() -> mutation
// Input: { posts: WeekplanPost[], status: 'scheduled' | 'draft' }
// Per post: INSERT marketing_social_posts met:
//   - location_id, platform, content_text (caption), hashtags,
//   - content_type_tag, scheduled_at (berekend uit day+time),
//   - status, ai_generated: true
// Invalidate queries: ['social-posts', 'brand-intelligence']
```

---

## Stap 6: pg_cron job + config.toml

### pg_cron SQL (via insert tool):
```sql
SELECT cron.schedule(
  'marketing-generate-weekplan-weekly',
  '0 6 * * 1',  -- maandag 06:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://igqcfxizgtdkwnajvers.supabase.co/functions/v1/marketing-generate-weekplan',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ..."}'::jsonb,
    body := '{"triggered_by": "cron"}'::jsonb
  ) AS request_id;
  $$
);
```

### `supabase/config.toml` (edit)
```toml
[functions.marketing-generate-weekplan]
verify_jwt = false
```

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| `supabase/functions/marketing-generate-weekplan/index.ts` | Nieuw: wekelijkse weekplan generatie |
| `supabase/config.toml` | Edit: nieuwe function config |
| pg_cron SQL | Nieuw: maandag 06:00 UTC cron job |
| `src/components/marketing/dashboard/WeekplanCard.tsx` | Nieuw: weekplan card op dashboard |
| `src/components/marketing/dashboard/ContentIdeasSection.tsx` | Nieuw: content ideeen sectie |
| `src/hooks/useContentIdeas.ts` | Nieuw: content ideeen query hook |
| `src/hooks/useScheduleWeekplan.ts` | Nieuw: weekplan insert mutation |
| `src/pages/marketing/MarketingDashboard.tsx` | Edit: weekplan card + content ideeen |
| `src/components/marketing/calendar/CalendarSidebar.tsx` | Edit: activeer weekplan + ideeen |

---

## Technische details

### Weekplan JSONB structuur (in current_weekplan)
```json
{
  "generated_at": "2026-02-23T06:00:00Z",
  "week_start": "2026-02-23",
  "posts": [
    {
      "day": "dinsdag",
      "time": "11:30",
      "platform": "instagram",
      "content_type": "food_shot",
      "caption": "Verse pasta van de dag...",
      "hashtags": ["pasta", "freshfood", "lunch"],
      "photo_suggestion": "Close-up van de pasta met zonlicht"
    }
  ]
}
```

### scheduled_at berekening
Bij het inplannen worden `day` + `time` omgezet naar een concrete `TIMESTAMPTZ`:
- Bepaal de eerstvolgende {dag} vanaf vandaag
- Combineer met de opgegeven tijd in de locatie timezone

### Nederlandse feestdagen
Hardcoded lijst voor 2026 in de edge function: Koningsdag (27 april), Bevrijdingsdag (5 mei), Hemelvaart, Pinksteren, Kerst, Oud & Nieuw. Geen externe API nodig.

### Cross-module events
Bestaande `cross_module_events` tabel wordt gelezen (niet geschreven). Event types zoals `empty_shift_detected`, `new_menu_item_added` worden als context meegegeven aan de AI voor relevante suggesties.

### Geen database wijzigingen
Alle benodigde tabellen en kolommen bestaan al: `marketing_brand_intelligence.current_weekplan`, `marketing_content_ideas`, `cross_module_events`, `marketing_social_posts`.

---

## Wat NIET in deze sessie

- Drag-and-drop weekplan herschikking
- Per-post editing in de weekplan card
- Weekplan notificaties (push/email)
- A/B varianten per post
- Automatisch publiceren (alleen inplannen)
