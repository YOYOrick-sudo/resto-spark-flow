# Nesto Marketing Module — Volledige Specificatie

> Upload dit als project knowledge in Lovable. Dit document beschrijft WAT de marketing module doet, HOE het integreert met de bestaande architectuur, en WANNEER elke feature gebouwd wordt.

## Visie

De marketing module maakt van elke restauranthouder een marketeer — zonder dat ze er één worden. Het systeem draait campagnes, plant content, en genereert ideeën op basis van wat er daadwerkelijk in het restaurant gebeurt. De operator ziet resultaten in euro's en couverts, niet in open rates.

**Kernprincipe:** Marketing is geen add-on. Het is intelligentie die verweven is met elke module — van keuken tot reserveringen tot menukaart.

**Unieke positie:** Nesto is het enige platform dat keukendata, menu-engineering, reserveringen, en gastprofielen combineert in marketing. Geen concurrent heeft deze cross-module intelligentie.

---

## Architectuur-integratie

### Wat NIET verandert
- Multi-tenant structuur → marketing is per location
- RLS → standaard location-based patterns
- `get_user_context()` → geen wijziging
- Permission systeem → bestaande patterns
- Signal Provider interface → marketing levert signals via bestaand framework
- Device modes → marketing werkt op alle devices
- AI Infrastructure → bestaande 3-tier LLM architectuur (SQL → goedkoop LLM → premium LLM)

### Wat WEL verandert
- `module_key` enum: `'marketing'` bestaat al in schema ✅
- Nieuwe permissions: `marketing.view`, `marketing.manage`, `marketing.publish`, `marketing.analytics`
- 8-12 nieuwe database tabellen
- 5-8 nieuwe Edge Functions
- 3-5 pg_cron jobs
- Externe API-integraties: Resend (email), Meta Graph API (Instagram + Facebook), Google Business Profile API, TikTok API
- Navigatie: nieuw menu-item "Marketing" (gated op `marketing.view`)

### Cross-Module Event Bus (NIEUW)

De marketing module is uniek omdat het zowel **bron** als **ontvanger** van signals is. Dit vereist een lichtgewicht event bus:

```sql
CREATE TABLE cross_module_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  source_module TEXT NOT NULL,          -- 'reservations', 'kitchen', 'menu_engineering'
  event_type TEXT NOT NULL,             -- 'empty_shift_detected', 'overstock_ingredient', 'puzzle_item_needs_promotion'
  payload JSONB NOT NULL,               -- Module-specifieke data
  consumed_by JSONB DEFAULT '[]',       -- Welke modules hebben dit event verwerkt
  expires_at TIMESTAMPTZ NOT NULL,      -- Auto-cleanup
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cme_location_type ON cross_module_events(location_id, event_type);
CREATE INDEX idx_cme_expires ON cross_module_events(expires_at);
```

**Event flow:**
1. Reserveringen-module detecteert "lege shift morgen" → insert event
2. Marketing module's cron job pikt event op → genereert flash-promotie concept
3. Event wordt gemarkeerd als consumed
4. pg_cron ruimt verlopen events dagelijks op

**Events die de marketing module ontvangt:**

| Bron | Event | Marketing actie |
|------|-------|-----------------|
| Reserveringen | `empty_shift_detected` | Flash-promotie naar frequente gasten |
| Reserveringen | `high_cancellation_day` | Extra promotie voor die dag |
| Keuken | `overstock_ingredient` | "Chef's Special" campagne |
| Menu Engineering | `puzzle_item_needs_promotion` | Targeted campagne voor hoge-marge item |
| Menu Engineering | `new_menu_item_added` | Social post + email aan relevante segmenten |
| Gastprofielen | `vip_birthday_upcoming` | Verjaardagscampagne |
| Gastprofielen | `guest_at_risk` | Win-back campagne |

**Events die de marketing module verstuurt:**

| Event | Ontvangers |
|-------|------------|
| `campaign_sent` | Analytics, Assistent |
| `campaign_revenue_attributed` | Revenue module, Assistent |
| `review_response_needed` | Assistent (signal) |
| `social_engagement_spike` | Assistent (signal) |

### Assistent-integratie

De marketing module volgt exact het bestaande SignalProvider pattern:

**`MarketingSignalProvider`** — registreer in evaluate-signals:

| Signal | Severity | Conditie | Cooldown |
|--------|----------|----------|----------|
| `marketing_email_open_rate_declining` | warning | Open rate daalt 3 weken op rij | 1 week |
| `marketing_at_risk_guests` | info | 10+ gasten met 60+ dagen inactiviteit | 3 dagen |
| `marketing_review_score_declining` | warning | Google score gedaald ≥0.3 in 30 dagen | 1 week |
| `marketing_unscheduled_week` | info | Komende 7 dagen <3 social posts ingepland | 3 dagen |
| `marketing_campaign_milestone` | ok | Campagne heeft €1000+ revenue behaald | per campagne |
| `marketing_google_post_expiring` | info | Google Business post verloopt binnen 24u | 1 dag |

**Insight combinaties:**

```
Signal: marketing_at_risk_guests (12 gasten at-risk)
Signal: menu_engineering → puzzle_item_needs_promotion (zeebaars, hoge marge)
→ Insight: "12 at-risk gasten, waarvan 8 vis-liefhebbers. Nieuwe zeebaars is hoge-marge puzzle item."
```

```
Signal: reservations → empty_shift_detected (dinsdag lunch 35% bezet)
Signal: marketing_unscheduled_week (weinig content gepland)
→ Insight: "Dinsdag lunch onderbezet. Geen promotie gepland voor deze week."
```

**Guidance (Laag 3, AI):**
- "Overweeg een win-back campagne met de nieuwe zeebaars naar je 8 vis-liefhebbers"
- "Overweeg een Instagram Story met lunch-special voor dinsdag"
- Alleen bij herhaalde patronen, max 1 suggestie per insight, altijd optioneel

### Pricing integratie

Marketing wordt onderdeel van bestaande tiers:

| Tier | Marketing features |
|------|-------------------|
| **Starter** | Geen marketing |
| **Professional** | Email campagnes + automatische flows + basis social posting + review monitoring |
| **Enterprise** | + AI content generatie + cross-module campagnes + advanced analytics + multi-locatie |

---

## Database Schema

### Core tabellen

**`marketing_brand_kit`**
Huisstijl instellingen per locatie.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID (PK) | |
| location_id | UUID (FK, UNIQUE) | |
| logo_url | TEXT | Logo URL (Supabase Storage) |
| primary_color | TEXT | Hex kleurcode |
| secondary_color | TEXT | Hex kleurcode |
| accent_color | TEXT | Hex kleurcode |
| font_heading | TEXT | Font voor koppen |
| font_body | TEXT | Font voor lopende tekst |
| tone_of_voice | TEXT | 'formal', 'friendly', 'casual', 'playful' |
| tone_description | TEXT | Vrije beschrijving van merkstijl |
| default_greeting | TEXT | Standaard aanhef in emails |
| default_signature | TEXT | Standaard afsluiting |
| social_handles | JSONB | `{ instagram: "@...", facebook: "...", tiktok: "..." }` |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

**`marketing_campaigns`**
Alle campagnes (email, social, multi-channel).

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID (PK) | |
| location_id | UUID (FK) | |
| campaign_type | TEXT | 'email', 'social', 'multi_channel' |
| name | TEXT | Campagnenaam |
| subject | TEXT | Email onderwerp (nullable voor social) |
| content_html | TEXT | HTML content voor email |
| content_text | TEXT | Plain text versie |
| content_social | JSONB | Per-platform content `{ instagram: {...}, facebook: {...} }` |
| segment_id | UUID (FK, nullable) | Doelgroep segment |
| segment_filter | JSONB | Inline filter als geen segment_id |
| status | TEXT | 'draft', 'scheduled', 'sending', 'sent', 'paused', 'failed' |
| scheduled_at | TIMESTAMPTZ | Geplande verzendtijd |
| sent_at | TIMESTAMPTZ | Werkelijke verzendtijd |
| sent_count | INTEGER DEFAULT 0 | Aantal verzonden |
| ai_generated | BOOLEAN DEFAULT false | Door AI gegenereerd |
| trigger_type | TEXT | 'manual', 'automated', 'cross_module' |
| trigger_event | TEXT | Event dat de campagne triggerde |
| created_by | UUID (FK) | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

**`marketing_templates`**
Herbruikbare templates voor email en social.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID (PK) | |
| location_id | UUID (FK, nullable) | NULL = platform-breed template |
| template_type | TEXT | 'email', 'social_instagram', 'social_facebook', 'social_google', 'social_tiktok' |
| name | TEXT | Template naam |
| category | TEXT | 'welcome', 'birthday', 'winback', 'promotion', 'event', 'seasonal', 'review_request', 'custom' |
| content_html | TEXT | HTML template met placeholders |
| content_text | TEXT | Plain text template |
| thumbnail_url | TEXT | Preview afbeelding |
| is_system | BOOLEAN DEFAULT false | Platform-breed (niet bewerkbaar) |
| is_active | BOOLEAN DEFAULT true | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

**`marketing_segments`**
Opgeslagen doelgroep-segmenten.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID (PK) | |
| location_id | UUID (FK) | |
| name | TEXT | Segment naam |
| description | TEXT | |
| filter_rules | JSONB | Filterregels (zie hieronder) |
| is_dynamic | BOOLEAN DEFAULT true | Herberekent bij gebruik |
| guest_count | INTEGER | Laatst berekende aantal gasten |
| guest_count_updated_at | TIMESTAMPTZ | |
| is_system | BOOLEAN DEFAULT false | Systeem-segment (niet verwijderbaar) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Filter rules structuur:**
```json
{
  "conditions": [
    { "field": "total_visits", "operator": "gte", "value": 3 },
    { "field": "days_since_last_visit", "operator": "gte", "value": 60 },
    { "field": "tags", "operator": "contains", "value": "vis-liefhebber" },
    { "field": "average_spend", "operator": "gte", "value": 50 }
  ],
  "logic": "AND"
}
```

**Systeem-segmenten (automatisch aangemaakt per locatie):**

| Segment | Filter |
|---------|--------|
| Nieuwe gasten | `total_visits = 1 AND days_since_last_visit < 30` |
| Reguliere gasten | `total_visits >= 3` |
| VIP gasten | `tags contains 'vip'` |
| At-risk gasten | `total_visits >= 2 AND days_since_last_visit >= 45` |
| Verloren gasten | `days_since_last_visit >= 90` |
| Verjaardagen deze maand | `birthday_month = current_month` |

---

**`marketing_automation_flows`**
Automatische campagne-flows.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID (PK) | |
| location_id | UUID (FK) | |
| name | TEXT | Flow naam |
| flow_type | TEXT | 'welcome', 'birthday', 'winback_30d', 'winback_60d', 'winback_90d', 'post_visit', 'review_request', 'loyalty_milestone', 'custom' |
| trigger_config | JSONB | Trigger configuratie |
| steps | JSONB | Array van stappen (delay, send email, send social, condition) |
| is_active | BOOLEAN DEFAULT true | |
| template_id | UUID (FK, nullable) | Standaard template |
| stats | JSONB | `{ total_triggered: 0, total_sent: 0, total_converted: 0 }` |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Default flows (actief vanaf dag 1):**

| Flow | Trigger | Stappen |
|------|---------|---------|
| Welkomst | Eerste reservering voltooid | Wacht 2u → Bedankmail met "volg ons" CTA |
| Verjaardag | 7 dagen voor verjaardag | Felicitatie + aanbieding |
| Win-back 30d | 30 dagen geen bezoek | "We missen je" + nieuw menu-item highlight |
| Win-back 60d | 60 dagen geen bezoek | Persoonlijk aanbod op basis van favoriete gerecht |
| Win-back 90d | 90 dagen geen bezoek | Laatste poging, sterker aanbod |
| Post-visit review | 3u na bezoek | Review-verzoek met directe link |

---

**`marketing_campaign_analytics`**
Per-campagne metrics.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID (PK) | |
| campaign_id | UUID (FK) | |
| location_id | UUID (FK) | |
| channel | TEXT | 'email', 'instagram', 'facebook', 'google', 'tiktok' |
| sent_count | INTEGER DEFAULT 0 | |
| delivered_count | INTEGER DEFAULT 0 | |
| opened_count | INTEGER DEFAULT 0 | |
| clicked_count | INTEGER DEFAULT 0 | |
| bounced_count | INTEGER DEFAULT 0 | |
| unsubscribed_count | INTEGER DEFAULT 0 | |
| reservations_attributed | INTEGER DEFAULT 0 | Reserveringen via deze campagne |
| revenue_attributed | NUMERIC DEFAULT 0 | Omzet via deze campagne |
| social_impressions | INTEGER DEFAULT 0 | |
| social_reach | INTEGER DEFAULT 0 | |
| social_engagement | INTEGER DEFAULT 0 | Likes + comments + shares |
| social_saves | INTEGER DEFAULT 0 | |
| updated_at | TIMESTAMPTZ | |

---

**`marketing_social_posts`**
Individuele social media posts.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID (PK) | |
| location_id | UUID (FK) | |
| campaign_id | UUID (FK, nullable) | Optionele koppeling aan campagne |
| platform | TEXT | 'instagram', 'facebook', 'google_business', 'tiktok' |
| post_type | TEXT | 'feed', 'story', 'reel', 'carousel', 'google_post', 'tiktok_video' |
| content_text | TEXT | Post tekst/caption |
| hashtags | TEXT[] | |
| media_urls | TEXT[] | Afbeelding/video URLs |
| link_url | TEXT | Link in post (nullable) |
| status | TEXT | 'draft', 'scheduled', 'published', 'failed' |
| scheduled_at | TIMESTAMPTZ | |
| published_at | TIMESTAMPTZ | |
| external_post_id | TEXT | Platform-specifiek post ID |
| is_recurring | BOOLEAN DEFAULT false | Terugkerende post |
| recurrence_rule | JSONB | `{ frequency: 'weekly', day: 'tuesday', time: '11:00' }` |
| ai_generated | BOOLEAN DEFAULT false | |
| analytics | JSONB | Platform-specifieke metrics |
| created_by | UUID (FK) | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

**`marketing_social_accounts`**
Gekoppelde social media accounts.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID (PK) | |
| location_id | UUID (FK) | |
| platform | TEXT | 'instagram', 'facebook', 'google_business', 'tiktok' |
| account_name | TEXT | Display naam |
| account_id | TEXT | Platform-specifiek account ID |
| access_token | TEXT | Encrypted OAuth token |
| refresh_token | TEXT | Encrypted refresh token |
| token_expires_at | TIMESTAMPTZ | |
| page_id | TEXT | Facebook Page ID (voor FB + IG) |
| is_active | BOOLEAN DEFAULT true | |
| last_synced_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

---

**`marketing_reviews`**
Reviews van externe platforms.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID (PK) | |
| location_id | UUID (FK) | |
| platform | TEXT | 'google', 'tripadvisor', 'yelp', 'thefork' |
| external_review_id | TEXT | Platform-specifiek review ID |
| author_name | TEXT | |
| rating | FLOAT | 1-5 |
| review_text | TEXT | |
| review_date | TIMESTAMPTZ | |
| response_text | TEXT | Ons antwoord |
| response_date | TIMESTAMPTZ | |
| ai_suggested_response | TEXT | AI-gegenereerde suggestie |
| sentiment | TEXT | 'positive', 'neutral', 'negative' |
| sentiment_aspects | JSONB | `{ food: 'positive', service: 'negative', ambiance: 'positive' }` |
| is_featured | BOOLEAN DEFAULT false | Gebruiken als social proof |
| customer_id | UUID (FK, nullable) | Koppeling aan gastprofiel (indien herkenbaar) |
| created_at | TIMESTAMPTZ | |

---

**`marketing_content_ideas`**
AI-gegenereerde content suggesties.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID (PK) | |
| location_id | UUID (FK) | |
| idea_type | TEXT | 'social_post', 'email_campaign', 'blog_post', 'event_promo', 'seasonal', 'cross_module' |
| source | TEXT | 'calendar', 'menu_change', 'seasonal', 'trending', 'cross_module_event' |
| source_event_id | UUID (FK, nullable) | Referentie naar cross_module_events |
| title | TEXT | Korte beschrijving |
| description | TEXT | Uitgebreide suggestie |
| suggested_content | JSONB | Voorgestelde tekst, hashtags, timing |
| suggested_segment_id | UUID (FK, nullable) | Voorgesteld doelgroep-segment |
| suggested_date | DATE | Voorgestelde publicatiedatum |
| priority | INTEGER | 1-10 (hoe relevant/urgent) |
| status | TEXT | 'suggested', 'accepted', 'dismissed', 'converted' |
| converted_to_campaign_id | UUID (FK, nullable) | Als de suggestie is omgezet |
| created_at | TIMESTAMPTZ | |

---

**`marketing_contact_preferences`**
GDPR-compliant consent tracking per gast per kanaal.

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | UUID (PK) | |
| customer_id | UUID (FK) | |
| location_id | UUID (FK) | |
| channel | TEXT | 'email', 'sms', 'whatsapp', 'push' |
| opted_in | BOOLEAN DEFAULT false | |
| opted_in_at | TIMESTAMPTZ | |
| opted_out_at | TIMESTAMPTZ | |
| consent_source | TEXT | 'widget', 'in_store', 'import', 'manual' |
| double_opt_in_confirmed | BOOLEAN DEFAULT false | GDPR vereiste |
| double_opt_in_token | TEXT | |
| double_opt_in_sent_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Constraints:** UNIQUE(customer_id, location_id, channel)

---

### RLS Policies

Alle marketing tabellen volgen het standaard Nesto RLS pattern:

```sql
-- Voorbeeld voor marketing_campaigns
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Location access" ON marketing_campaigns
  FOR ALL USING (location_id IN (
    SELECT location_id FROM user_location_roles WHERE user_id = auth.uid()
  ));
```

### Aanpassingen aan bestaande tabellen

**`customers` tabel** (Fase 4.6) — controleer dat deze kolommen bestaan:
- `email` (text) — voor email marketing
- `phone_number` (text) — voor SMS/WhatsApp (Fase 4.14)
- `total_visits` (integer) — voor segmentatie
- `last_visit_date` (date) — voor win-back triggers
- `no_show_count` (integer) — voor segmentatie
- `average_spend` (numeric) — voor segmentatie
- `tags` (text[]) — voor targeting
- `birthday` (date, nullable) — voor verjaardag flows
- `dietary_preferences` (text[]) — voor allergie-safe campagnes
- `favorite_items` (jsonb, nullable) — voor gepersonaliseerde aanbevelingen

**`locations` tabel** — voeg toe:
- `google_place_id` (text, nullable) — voor Google Business Profile
- `google_business_access_token` (text, nullable) — encrypted
- `tripadvisor_url` (text, nullable) — voor review monitoring

---

## Edge Functions

### `marketing-generate-content`
AI content generatie voor email en social.

**Input:**
```json
{
  "location_id": "uuid",
  "content_type": "email" | "social_post" | "social_caption",
  "context": {
    "purpose": "winback" | "promotion" | "event" | "seasonal" | "new_item",
    "target_segment": "uuid",
    "menu_items": ["uuid"],
    "tone": "from brand_kit",
    "platform": "instagram" | "facebook" | "google" | "tiktok"
  }
}
```

**Flow:**
1. Load brand kit (tone, stijl, handles)
2. Load segment data (wie zijn de ontvangers)
3. Load relevante menu data (items, prijzen, beschrijvingen)
4. Load actuele context (seizoen, feestdagen, events)
5. Genereer content via LLM (Laag 1: Haiku/GPT-4o-mini voor social captions, Laag 2: Sonnet voor email body)
6. Return gestructureerde output

**LLM System Prompt constraints:**
- Gebruik ALTIJD de tone of voice uit brand kit
- Noem NOOIT prijzen tenzij expliciet gevraagd
- Gebruik ALTIJD de juiste social handles
- Max 150 woorden voor social captions
- Include ALTIJD een CTA
- Genereer hashtags alleen voor Instagram en TikTok

---

### `marketing-generate-ideas`
Dagelijkse content ideeën generatie.

**Trigger:** pg_cron, dagelijks 06:00 UTC

**Flow:**
1. Check kalender: feestdagen, seizoensgebonden momenten komende 14 dagen
2. Check cross_module_events: onverwerkte events
3. Check menu data: nieuwe items, trending items, puzzle items
4. Check gastdata: aankomende verjaardagen, at-risk gasten
5. Genereer 3-5 content ideeën via LLM
6. Insert in marketing_content_ideas met prioriteit
7. Ruim oude dismissed ideeën op (>30 dagen)

---

### `marketing-send-email`
Email verzending via Resend (bestaande provider).

**Input:** campaign_id
**Flow:**
1. Load campagne + segment
2. Bereken ontvangers (segment filter op customers)
3. Check consent per ontvanger (marketing_contact_preferences)
4. Personaliseer content per ontvanger (naam, favoriete gerechten)
5. Verzend via Resend batch API
6. Update analytics (sent_count)
7. Registreer webhooks voor opens/clicks

---

### `marketing-publish-social`
Social media post publicatie.

**Input:** social_post_id
**Flow:**
1. Load post data + media
2. Load social account credentials
3. Publiceer naar juist platform via API:
   - Instagram/Facebook → Meta Graph API
   - Google Business → Google Business Profile API
   - TikTok → TikTok Content Publishing API
4. Sla external_post_id op
5. Update status naar 'published'

---

### `marketing-sync-reviews`
Reviews ophalen van externe platforms.

**Trigger:** pg_cron, elke 6 uur

**Flow:**
1. Per locatie met actieve review-integratie
2. Haal nieuwe reviews op via Google Places API / TripAdvisor API
3. Voer sentiment analyse uit via LLM (Laag 1: goedkoop)
4. Insert in marketing_reviews
5. Genereer AI response-suggestie voor negatieve reviews
6. Trigger signal als score significant daalt

---

### `marketing-process-automation`
Automatische flow processing.

**Trigger:** pg_cron, elke 15 minuten

**Flow:**
1. Check alle actieve automation flows
2. Per flow: evalueer trigger condities tegen gastdata
3. Voor getriggerde gasten: voer flow stappen uit (delays, sends)
4. Respecteer suppressie: max 1 marketing email per gast per week
5. Update flow stats

---

### `marketing-attribution`
Campagne-to-revenue attributie.

**Trigger:** pg_cron, dagelijks 02:00 UTC

**Flow:**
1. Voor alle campagnes verzonden in de afgelopen 30 dagen
2. Match ontvangers tegen reserveringen gemaakt na campagne-verzending
3. Attributie model:
   - Direct click (UTM tracking) → 100% attributie
   - 7-dagen lookback (ontving email, boekte binnen 7 dagen) → 50% attributie
   - 30-dagen lookback → 25% attributie
4. Bereken revenue per campagne
5. Update marketing_campaign_analytics

---

## pg_cron Jobs

| Job | Frequentie | Edge Function | Beschrijving |
|-----|------------|---------------|-------------|
| Content ideeën | Dagelijks 06:00 | `marketing-generate-ideas` | AI ideeën generatie |
| Automation flows | Elke 15 min | `marketing-process-automation` | Automatische flow processing |
| Review sync | Elke 6 uur | `marketing-sync-reviews` | Reviews ophalen + sentiment |
| Revenue attributie | Dagelijks 02:00 | `marketing-attribution` | Campagne ROI berekening |
| Social analytics sync | Elke 4 uur | `marketing-sync-social-stats` | Social metrics ophalen |
| Google post refresh | Dagelijks 08:00 | `marketing-refresh-google-posts` | Verlopen posts herplaatsen |
| Cleanup | Wekelijks zondag 03:00 | `marketing-cleanup` | Oude events, dismissed ideas opruimen |

---

## UI Specificatie

### Navigatie

Route: `/marketing`
Sub-routes:
- `/marketing` — Dashboard (overzicht)
- `/marketing/campagnes` — Campagnes overzicht + builder
- `/marketing/kalender` — Content kalender
- `/marketing/social` — Social media beheer
- `/marketing/email` — Email campagnes
- `/marketing/reviews` — Review management
- `/marketing/segmenten` — Doelgroep segmenten
- `/marketing/analytics` — Analytics dashboard
- `/marketing/instellingen` — Brand kit, accounts, automation flows

### Dashboard (`/marketing`)

**Bovenaan: 4-5 KPI kaarten (Polar.sh-stijl met data als design element)**

| KPI | Data | Actieknop |
|-----|------|-----------|
| Marketing omzet deze maand | €X.XXX (trend vs vorige maand) | "Bekijk details" |
| Gasten bereikt | XXX gasten via alle kanalen | — |
| At-risk gasten | XX gasten (60+ dagen inactief) | "Win-back sturen" |
| Google score | 4.X ★ (trend) | "Reviews bekijken" |
| Content gepland | X posts komende 7 dagen | "Kalender openen" |

**Midden: AI Content Ideeën**
Carousel van 3-5 ideeën gegenereerd door `marketing-generate-ideas`:
- Per idee: icoon (seizoen/event/menu), titel, korte beschrijving
- Acties: "Maak campagne" (→ builder met pre-filled content), "Later", "Niet relevant"
- Cross-module ideeën krijgen een badge: "🍳 Keuken" of "📊 Menu" of "📅 Reserveringen"

**Onderaan: Recente activiteit**
Timeline van laatste 10 marketing acties (campagnes verzonden, posts gepubliceerd, reviews beantwoord)

### Content Kalender (`/marketing/kalender`)

**Visuele maandkalender** met:
- Drag-and-drop posts naar datums
- Kleur per kanaal (blauw = email, roze = Instagram, groen = Google, etc.)
- Click op dag → quick-add post/campagne
- Feestdagen en seizoensgebonden momenten automatisch gemarkeerd
- Recurring posts tonen met herhaal-icoon
- Week-view en dag-view als alternatief

**Sidebar: content suggesties**
- AI-gegenereerde ideeën voor de geselecteerde week
- "Auto-fill week" knop: AI plant 3-5 posts voor de komende week

### Email Builder (`/marketing/email`)

**Drag-and-drop builder met restaurant-specifieke blokken:**

| Blok type | Functie |
|-----------|---------|
| Header met logo | Automatisch uit brand kit |
| Tekst | Rich text editor |
| Afbeelding | Upload of uit media library |
| Menu item | Trekt gerecht + foto + prijs uit menukaart |
| Reserveerknop | Link naar booking widget |
| Review quote | Selecteer uit beste reviews |
| Coupon/aanbod | Code + vervaldatum |
| Social follow knoppen | Uit brand kit social handles |
| Footer | Automatisch met unsubscribe link (GDPR) |

**Template selectie:**
- 14+ kant-en-klare templates per categorie
- Preview in desktop en mobile view
- "Pas aan met AI" knop: beschrijf wat je wilt, AI past template aan

### Social Media (`/marketing/social`)

**Tabbladen per platform:**
- Overzicht (alle platforms)
- Instagram
- Facebook
- Google Business
- TikTok

**Per post:**
- Platform-specifieke preview (Instagram grid, Facebook feed, etc.)
- Auto-resize waarschuwingen (verkeerde beeldverhouding)
- Hashtag suggesties (AI, per platform)
- Beste timing suggestie (AI, gebaseerd op historische engagement)
- "Post nu" of "Inplannen" met datum/tijd picker

**Instagram Grid Preview:**
- Visueel 3x3 grid van recente + geplande posts
- Drag-and-drop om volgorde aan te passen
- Kleur-harmonie indicatie

**Recurring posts manager:**
- Lijst van terugkerende posts
- Per post: frequentie, dag, tijd, content, media
- Variatie-opties: AI genereert elke keer een iets andere caption

### Review Management (`/marketing/reviews`)

**Unified inbox:**
- Alle reviews van alle platforms in één lijst
- Filter: platform, rating, beantwoord/onbeantwoord, sentiment
- Per review: AI-suggested response (klik om te laden)
- "Beantwoord" → response gaat naar het juiste platform
- "Feature" → markeer als social proof voor gebruik in campagnes/widget

**Dashboard:**
- Gemiddelde score per platform met trend
- Sentiment breakdown (food, service, ambiance, value)
- Review volume per week
- Response rate en gemiddelde responstijd

### Segmenten (`/marketing/segmenten`)

**Overzicht:**
- Systeem-segmenten (niet bewerkbaar, altijd aanwezig)
- Custom segmenten
- Per segment: aantal gasten, laatste update, meest recente campagne

**Segment builder:**
- Visuele filter builder (geen code)
- Condities: bezoekfrequentie, laatste bezoek, gemiddelde besteding, tags, verjaardagsmaand, favoriete gerechten, allergiëen
- Live preview: "Dit segment bevat 47 gasten"
- Opslaan als segment of direct gebruiken in campagne

### Analytics (`/marketing/analytics`)

**Overzichtspagina met tijdperiode selector:**

| Metric | Visualisatie |
|--------|-------------|
| Marketing-attributed revenue | Grote getal + lijn grafiek (trend) |
| Revenue per kanaal | Staafdiagram (email vs social vs review) |
| Campagne performance | Tabel met sorteerbare kolommen |
| Segment groei | Lijn grafiek per segment |
| Email metrics | Open rate, click rate, unsubscribe rate |
| Social metrics | Bereik, engagement, groei per platform |
| Review metrics | Score trend, volume, sentiment |

**Per-campagne detail:**
- Funnel: verzonden → geopend → geklikt → gereserveerd → omzet
- Revenue attributie breakdown
- A/B test resultaten (indien van toepassing)

### Instellingen (`/marketing/instellingen`)

**Tabs:**

| Tab | Inhoud |
|-----|--------|
| Brand Kit | Logo, kleuren, fonts, tone of voice |
| Social Accounts | OAuth koppelingen per platform |
| Email Instellingen | Afzender naam/email, reply-to, signature |
| Automation Flows | Aan/uit per flow, timing aanpassen, template kiezen |
| Review Platforms | Google Place ID, TripAdvisor URL |
| GDPR | Consent teksten, double opt-in instellingen |
| Suppressie | Globale suppressielijst, bounce management |

---

## Implementatie Sprints

### Sprint 1: Foundation + Email (fundament)

**Scope:** Database schema, email campagnes, automatische flows, segmentatie, brand kit, basis analytics.

**Database:**
- [ ] Alle marketing tabellen aanmaken (zie schema hierboven)
- [ ] RLS policies voor alle tabellen
- [ ] Systeem-segmenten seeden per locatie
- [ ] Default automation flows aanmaken per locatie
- [ ] cross_module_events tabel

**Edge Functions:**
- [ ] `marketing-send-email` — Resend integratie
- [ ] `marketing-process-automation` — Flow processing
- [ ] `marketing-attribution` — Revenue attributie

**pg_cron:**
- [ ] Automation flow processing (elke 15 min)
- [ ] Revenue attributie (dagelijks)

**UI:**
- [ ] Marketing navigatie + routing
- [ ] Dashboard met KPI kaarten (basis versie)
- [ ] Email builder met drag-and-drop + restaurant-blokken
- [ ] Template bibliotheek (14+ templates)
- [ ] Segment builder met visuele filters
- [ ] Automation flows overzicht + aan/uit toggle
- [ ] Brand kit instellingen pagina
- [ ] Contactlijst beheer + GDPR consent tracking
- [ ] Basis analytics (email metrics)

**Permissions:**
- [ ] `marketing.view` — dashboard en analytics bekijken
- [ ] `marketing.manage` — campagnes maken en bewerken
- [ ] `marketing.publish` — campagnes versturen en posts publiceren
- [ ] `marketing.analytics` — gedetailleerde analytics bekijken

**Acceptance Criteria Sprint 1:**
- [ ] Operator kan email campagne maken, segmenteren, en versturen
- [ ] Automatische flows (welkomst, verjaardag, win-back) draaien zonder setup
- [ ] Revenue wordt geattribueerd aan campagnes via 30-dagen lookback
- [ ] GDPR consent wordt bijgehouden per gast per kanaal
- [ ] Brand kit wordt toegepast op alle email templates
- [ ] Dashboard toont marketing omzet, gasten bereikt, at-risk gasten

---

### Sprint 2: Social Media + Kalender

**Scope:** Multi-platform social posting, content kalender, AI content generatie, autopost.

**Database:**
- [ ] `marketing_social_accounts` OAuth integratie
- [ ] `marketing_social_posts` met recurring support

**Edge Functions:**
- [ ] `marketing-publish-social` — Meta Graph API + Google Business API
- [ ] `marketing-generate-content` — AI content generatie
- [ ] `marketing-refresh-google-posts` — Auto-herplaatsing

**Externe integraties:**
- [ ] Meta Graph API OAuth flow (Instagram + Facebook)
- [ ] Google Business Profile API OAuth flow
- [ ] TikTok Content Publishing API (later, kan los)

**pg_cron:**
- [ ] Scheduled post publishing (elke 5 min check)
- [ ] Google post refresh (dagelijks)
- [ ] Social analytics sync (elke 4 uur)

**UI:**
- [ ] Content kalender (maand/week/dag view, drag-and-drop)
- [ ] Social post creator per platform met preview
- [ ] Instagram grid preview
- [ ] Multi-platform publishing (één post → meerdere platforms)
- [ ] Recurring posts manager
- [ ] AI caption generator met hashtag suggesties
- [ ] Social accounts koppelen (OAuth flows)
- [ ] Social analytics per platform

**Acceptance Criteria Sprint 2:**
- [ ] Operator kan post maken en publiceren naar Instagram, Facebook, Google Business
- [ ] Content kalender toont alle geplande posts visueel
- [ ] Recurring posts worden automatisch herhaald
- [ ] AI genereert captions en hashtags per platform
- [ ] Google Business posts worden automatisch herplaatst na 7 dagen
- [ ] Social metrics worden gesynchroniseerd en getoond

---

### Sprint 3: Intelligence Layer

**Scope:** AI content idee-generator, review management, UGC, cross-module campagnes, campagne builder verrijking.

**Edge Functions:**
- [ ] `marketing-generate-ideas` — Dagelijkse AI ideeën
- [ ] `marketing-sync-reviews` — Review ophalen + sentiment analyse
- [ ] `marketing-suggest-review-response` — AI review response

**Externe integraties:**
- [ ] Google Places API (reviews)
- [ ] Instagram Graph API (mentions/tags voor UGC)

**pg_cron:**
- [ ] Content ideeën generatie (dagelijks)
- [ ] Review sync (elke 6 uur)

**Signal Provider:**
- [ ] `MarketingSignalProvider` registreren in evaluate-signals
- [ ] Marketing signals implementeren (zie tabel hierboven)
- [ ] Cross-module event consumption implementeren

**UI:**
- [ ] AI content ideeën carousel op dashboard
- [ ] "Maak campagne" vanuit idee (pre-filled builder)
- [ ] Review management inbox met AI responses
- [ ] Review analytics dashboard (score trends, sentiment)
- [ ] UGC feed (Instagram mentions/tags)
- [ ] Cross-module campagne badges ("🍳 Keuken tip")
- [ ] Campagne builder: menu-item blok dat uit kaart trekt
- [ ] Campagne builder: reserveerknop naar widget

**Acceptance Criteria Sprint 3:**
- [ ] AI genereert dagelijks 3-5 content ideeën gebaseerd op kalender, menu, en cross-module events
- [ ] Reviews van Google worden automatisch opgehaald met sentiment analyse
- [ ] AI genereert response-suggesties voor reviews
- [ ] MarketingSignalProvider levert signals aan de Assistent
- [ ] Cross-module events (lege shift, overstock, puzzle item) triggeren campagne-suggesties
- [ ] Email builder heeft restaurant-specifieke blokken (menu items, reserveerknop)

---

### Sprint 4: Analytics + Polish

**Scope:** Geavanceerde analytics, A/B testing, Google Business beheer, performance optimalisatie.

**Edge Functions:**
- [ ] `marketing-sync-social-stats` — Geavanceerde social metrics
- [ ] `marketing-ab-test` — A/B test evaluatie

**UI:**
- [ ] Analytics dashboard met revenue-first metrics
- [ ] Per-campagne funnel visualisatie (verzonden → omzet)
- [ ] A/B testing interface (2 varianten, automatische winnaar)
- [ ] Google Business profile management (info sync, foto's)
- [ ] Campagne performance vergelijking
- [ ] Export functionaliteit (CSV, PDF)
- [ ] Mobile optimalisatie (3-tap campagne management)
- [ ] Dashboard polish (Polar.sh-stijl data visualisaties)

**Acceptance Criteria Sprint 4:**
- [ ] Analytics toont revenue in euro's per campagne
- [ ] Operator kan A/B test opzetten voor email onderwerpregels
- [ ] Google Business profiel is beheerbaar vanuit Nesto
- [ ] Dashboard is volledig responsive en werkt op mobile
- [ ] Alle data visualisaties volgen Polar.sh design filosofie

---

## Kosten-inschatting

### AI kosten per restaurant per maand

| Feature | Model | Frequentie | Kosten |
|---------|-------|------------|--------|
| Content ideeën generatie | Haiku / GPT-4o-mini | 1x/dag (30 calls) | €0.01-0.05 |
| Email content generatie | Haiku / GPT-4o-mini | 4-8x/maand | €0.01-0.03 |
| Social caption generatie | Haiku / GPT-4o-mini | 10-20x/maand | €0.01-0.05 |
| Review sentiment analyse | Haiku / GPT-4o-mini | 10-30x/maand | €0.01-0.05 |
| Review response suggesties | Sonnet / GPT-4o | 5-10x/maand | €0.02-0.05 |
| **Totaal AI** | | | **€0.06-0.23** |

### Externe service kosten

| Service | Kosten | Beschrijving |
|---------|--------|--------------|
| Resend | $0/maand (3000 emails free, daarna $20/maand) | Email verzending |
| Meta Graph API | Gratis | Instagram + Facebook posting |
| Google Business API | Gratis | Posts + reviews |
| TikTok API | Gratis | Content publishing |
| **Totaal extern** | **€0-20/maand** per Nesto-instance | |

**Totale marketing module kosten:** ~€0.50-1.00 per restaurant per maand (AI) + gedeelde Resend kosten.

---

## Wat dit NIET doet

| Niet | Waarom |
|------|--------|
| Automatische prijswijzigingen | Strategische beslissing van operator |
| Social media advertenties (Meta Ads, Google Ads) | Te complex, te veel risico, apart domein |
| Influencer outreach automatisering | Te persoonlijk, Tier 4 feature |
| Website/landingpage builder (v1) | Buiten scope, Tier 3 feature |
| Loyalty punten systeem | Apart module, Tier 3 feature |
| WhatsApp marketing berichten | Zie AI_FEATURE_6_WHATSAPP.md, apart kanaal |
| Concurrentie-analyse | Tier 4 feature, geen betrouwbare data |

---

## Later uitbreiden met

| Feature | Voorwaarde | Sprint |
|---------|------------|--------|
| Landing pages / micro-sites | Na Sprint 4, bij vraag | Tier 3 |
| A/B testing geavanceerd (multi-armed bandit) | Na 3+ maanden data | Tier 3 |
| Visuele editor (Canva-light) | Na Sprint 4 | Tier 3 |
| QR-code generator | Simpel, kan altijd | Tier 3 |
| Loyalty / referral program | Apart module | Tier 3 |
| Multi-locatie content sharing | Bij 5+ multi-locatie klanten | Tier 3 |
| Samenwerking & goedkeuring flows | Bij enterprise klanten | Tier 3 |
| TikTok integratie | Na Instagram/Facebook stabiel | Sprint 2 bonus |
| Competitor monitoring | Externe data sources nodig | Tier 4 |
| Influencer database | Bij vraag | Tier 4 |
| Gifting & vouchers | Stripe integratie nodig | Tier 4 |

---

## Afhankelijkheden

| Marketing feature | Vereist | Status |
|-------------------|---------|--------|
| Email campagnes | `customers` tabel met email + visit stats | Fase 4.6 |
| Segmentatie | `customers` tabel met tags, spend, visits | Fase 4.6 |
| Automatische flows | `customers` + `reservations` tabellen | Fase 4.6 |
| Revenue attributie | `reservations` + betalingsdata | Fase 4.6+ |
| Menu-item blokken | `menu_items` tabel | Fase 6 |
| Cross-module: keuken events | Keukenmodule live | Fase 5 |
| Cross-module: menu engineering | Menu Engineering live | Fase 6 |
| Booking widget CTA | Guest Widget live | Fase 4.10 ✅ |
| Review management | Google Place ID per locatie | Sprint 3 |
| Social posting | OAuth tokens per platform | Sprint 2 |

**Minimum vereiste voor Sprint 1:** Fase 4.6 (customers + reservations) moet af zijn. De marketing module kan technisch worden gebouwd zodra er gastdata en reserveringsdata beschikbaar zijn.

---

## Samenvatting

| Principe | Implementatie |
|----------|---------------|
| Zero-config | Automatische flows draaien vanaf dag 1 |
| AI schrijft, operator keurt goed | Content suggesties, nooit automatisch publiceren |
| Euro's, niet open rates | Revenue-first analytics dashboard |
| Cross-module intelligentie | Event bus verbindt keuken → marketing → reserveringen |
| GDPR-native | Double opt-in, per-kanaal consent, suppressie |
| Assistent-geïntegreerd | MarketingSignalProvider, insights, guidance |
| Progressieve complexiteit | Simpel standaard, geavanceerd achter toggles |

---

*Dit document wordt geraadpleegd bij elke Lovable sessie die marketing-features bouwt.*
