# Nesto Marketing Module — Volledige Specificatie v2

> Upload dit als project knowledge in Lovable. Dit document beschrijft WAT de marketing module doet, HOE het integreert met de bestaande architectuur, en WANNEER elke feature gebouwd wordt.
> 
> **Versie 2** — Toevoegingen t.o.v. v1:
> - Brand Intelligence Engine (lerend AI systeem)
> - Website popup & sticky bar (opt-in widgets)
> - Engagement coaching
> - Content series (optioneel)
> - Reserveringen ↔ marketing integratie (triggers, events, Guest Widget opt-in)
> - Correcte navigatiestructuur (settings onder INSTELLINGEN, operatie onder OPERATIE)
> - Afbakening transactioneel (Fase 4.14) vs promotioneel (marketing module)
> - Resend coördinatie met Fase 4.14

---

## Visie

De marketing module maakt van elke restauranthouder een marketeer — zonder dat ze er één worden. Het systeem draait campagnes, plant content, en genereert ideeën op basis van wat er daadwerkelijk in het restaurant gebeurt. De operator ziet resultaten in euro's en couverts, niet in open rates.

**Kernprincipe:** Marketing is geen add-on. Het is intelligentie die verweven is met elke module — van keuken tot reserveringen tot menukaart.

**Unieke positie:** Nesto is het enige platform dat keukendata, menu-engineering, reserveringen, en gastprofielen combineert in marketing. Geen concurrent heeft deze cross-module intelligentie.

**Differentiator: Brand Intelligence Engine.** Het systeem leert continu van de restaurant's content en performance. Na het koppelen van Instagram analyseert het bestaande posts, herkent patronen, en genereert content die klinkt alsof de restaurateur het zelf schreef. Elke week wordt het beter.

**UX vuistregel:** De operator ziet RESULTATEN, niet het proces. Ze merken dat suggesties beter worden. Ze hoeven niet te weten waarom. Als ze het dashboard openen en denken "er staat iets klaar voor me" → goed. Als ze denken "wat moet ik hier allemaal?" → te complex.

---

## Afbakening: Transactioneel vs Promotioneel

| Type | Module | Voorbeelden | Opt-in vereist? |
|------|--------|-------------|-----------------|
| **Transactioneel** | Fase 4.14 Messaging | Bevestiging, reminder, reconfirmatie, betaalverzoek, wachtlijst-invite | Nee (noodzakelijk voor dienstverlening) |
| **Promotioneel** | Marketing Module | Win-back, verjaardag, specials, nieuwsbrief, review-verzoek | Ja (GDPR marketing consent) |

**Resend coördinatie:** Zowel Fase 4.14 als de marketing module gebruiken Resend voor email. Ze delen dezelfde Resend instance en API key. De marketing module verzendt via de bestaande Resend config maar met een eigen afzendernaam (marketing_sender_name uit brand_kit). Campagne-emails bevatten altijd een unsubscribe link. Transactionele emails (Fase 4.14) bevatten geen unsubscribe link.

---

## Navigatiestructuur (BELANGRIJK)

Nesto heeft een strikte scheiding:

| Sectie | Bevat | Voorbeeld |
|--------|-------|-----------|
| **OPERATIE** | Werkpagina's waar je dagelijks in werkt | Reserveringen, Marketing Dashboard/Campagnes |
| **INSTELLINGEN** | Module-configuratie | Reserveringen (pacing, tafels), Marketing (brand kit, flows, GDPR) |

**Regel: nooit settings onder operatie mixen. Nooit werkpagina's onder instellingen mixen.**

**Marketing navigatie:**

INSTELLINGEN > Marketing (`/instellingen/marketing`):
- Algemeen (frequentie, verzendtijd, module status)
- Brand Kit (logo, kleuren, fonts, tone of voice)
- Email Instellingen (afzendernaam, reply-to)
- Automation Flows (aan/uit, timing)
- GDPR (consent tekst, double opt-in)
- Social Accounts (OAuth koppelingen) — Sprint 2
- Website Popup (popup config, embed code) — Sprint 2
- Review Platforms (Google Place ID, TripAdvisor URL) — Sprint 3

OPERATIE > Marketing (`/marketing`):
- Dashboard (`/marketing`) — Sprint 1.6
- Campagnes (`/marketing/campagnes`) — Sprint 1.4
- Kalender (`/marketing/kalender`) — Sprint 2
- Social (`/marketing/social`) — Sprint 2
- Reviews (`/marketing/reviews`) — Sprint 3
- Segmenten (`/marketing/segmenten`) — Sprint 1.3
- Analytics (`/marketing/analytics`) — Sprint 1.6

---

## Architectuur-integratie

### Wat NIET verandert
- Multi-tenant structuur → marketing is per location
- RLS → standaard location-based patterns
- `get_user_context()` → geen wijziging
- Permission systeem → bestaande patterns
- Signal Provider interface → marketing levert signals via bestaand framework
- Device modes → marketing werkt op alle devices
- AI Infrastructure → bestaande 3-tier LLM architectuur

### Wat WEL verandert
- `module_key` enum: `'marketing'` bestaat al in schema ✅
- Nieuwe permissions: `marketing.view`, `marketing.manage`, `marketing.publish`, `marketing.analytics`
- 12-15 nieuwe database tabellen
- 8-12 nieuwe Edge Functions
- 6-8 pg_cron jobs
- Externe API-integraties: Resend (email), Meta Graph API (Instagram + Facebook), Google Business Profile API
- Navigatie: settings onder INSTELLINGEN, werkpagina's onder OPERATIE

### Permissions en Role Mapping

| Permission | Beschrijving | Owner | Manager | Service |
|-----------|--------------|-------|---------|---------|
| `marketing.view` | Dashboard en analytics bekijken | ✅ | ✅ | ✅ |
| `marketing.manage` | Campagnes maken en bewerken | ✅ | ✅ | ❌ |
| `marketing.publish` | Campagnes versturen en posts publiceren | ✅ | ✅ | ❌ |
| `marketing.analytics` | Gedetailleerde analytics bekijken | ✅ | ✅ | ❌ |

`marketing.view` is de root view permission voor navigation gating.

### Cross-Module Event Bus

De marketing module is zowel **bron** als **ontvanger** van signals:

```sql
CREATE TABLE cross_module_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  source_module TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  consumed_by JSONB DEFAULT '[]',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cme_location_type ON cross_module_events(location_id, event_type);
CREATE INDEX idx_cme_expires ON cross_module_events(expires_at);
```

**Events die marketing ontvangt:**

| Bron | Event | Marketing actie |
|------|-------|----------------|
| Reserveringen | `guest_visit_completed` | Post-visit review flow, segment update |
| Reserveringen | `guest_first_visit` | Welcome flow |
| Reserveringen | `guest_becoming_regular` (3 bezoeken) | Loyalty content idee |
| Reserveringen | `guest_loyal_milestone` (10 bezoeken) | VIP campagne suggestie |
| Reserveringen | `guest_no_show` | Segment update |
| Reserveringen | `guest_cancelled` | Segment update |
| Reserveringen | `empty_shift_detected` | Flash-promotie suggestie |
| Keuken | `overstock_ingredient` | Chef's Special campagne |
| Menu Engineering | `puzzle_item_needs_promotion` | Targeted campagne |
| Menu Engineering | `new_menu_item_added` | Launch post + email |

**Events die marketing verstuurt:**

| Event | Ontvangers |
|-------|------------|
| `campaign_sent` | Analytics, Assistent |
| `campaign_revenue_attributed` | Revenue, Assistent |
| `review_response_needed` | Assistent |
| `review_score_declining` | Assistent |

### Reserveringen ↔ Marketing Integratie

Database triggers op `reservations.status`:
- `notify_marketing_on_reservation_change()` — INSERT cross_module_events bij completed/no_show/cancelled
- `notify_marketing_on_customer_milestone()` — INSERT bij total_visits = 1, 3, 10

pg_cron: `detect_empty_shifts` — dagelijks 16:00, check morgen <40% bezetting

Guest Widget: marketing opt-in checkbox ("Ik wil op de hoogte gehouden worden") → INSERT marketing_contact_preferences met double opt-in als enabled.

### Assistent-integratie (MarketingSignalProvider)

| Signal | Severity | Conditie | Cooldown |
|--------|----------|----------|----------|
| `marketing_email_open_rate_declining` | warning | Open rate 3 campagnes < vorige 3 | 1 week |
| `marketing_at_risk_guests` | info | 10+ gasten 60+ dagen inactief | 3 dagen |
| `marketing_review_score_declining` | warning | Score ≥0.3 gedaald in 30d | 1 week |
| `marketing_unscheduled_week` | info | <3 posts komende 7d | 3 dagen |
| `marketing_engagement_dropping` | warning | Engagement 20%+ onder baseline 2 weken | 1 week |
| `marketing_negative_review` | warning | Rating ≤ 2 onbeantwoord | 1 dag |

### Pricing integratie

| Tier | Marketing features |
|------|-------------------|
| **Starter** | Geen marketing |
| **Professional** | Email + flows + basis social + review monitoring |
| **Enterprise** | + Brand Intelligence + cross-module + advanced analytics |

---

## Database Schema

### Core tabellen (Sprint 1)

**`marketing_brand_kit`** — Huisstijl per locatie (UNIQUE op location_id)

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | UUID (PK) | |
| location_id | UUID (FK, UNIQUE) | |
| logo_url | TEXT | |
| primary_color | TEXT | Hex |
| secondary_color | TEXT | Hex |
| accent_color | TEXT | Hex |
| font_heading | TEXT | |
| font_body | TEXT | |
| tone_of_voice | TEXT | 'formal', 'friendly', 'casual', 'playful' |
| tone_description | TEXT | |
| default_greeting | TEXT | |
| default_signature | TEXT | |
| social_handles | JSONB | `{ instagram, facebook, tiktok }` |
| gdpr_consent_text | TEXT | |
| double_opt_in_enabled | BOOLEAN DEFAULT true | |
| marketing_sender_name | TEXT | |
| marketing_reply_to | TEXT | |
| max_email_frequency_days | INTEGER DEFAULT 7 | |
| default_send_time | TIME DEFAULT '10:00' | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**`marketing_campaigns`** — Alle campagnes

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | UUID (PK) | |
| location_id | UUID (FK) | |
| campaign_type | TEXT | 'email', 'social', 'multi_channel' |
| name | TEXT | |
| subject | TEXT | Email onderwerp |
| content_html | TEXT | |
| content_text | TEXT | |
| content_social | JSONB | Per-platform content |
| segment_id | UUID (FK, nullable) | |
| segment_filter | JSONB | Inline filter |
| status | TEXT | 'draft', 'scheduled', 'sending', 'sent', 'paused', 'failed' |
| scheduled_at | TIMESTAMPTZ | |
| sent_at | TIMESTAMPTZ | |
| sent_count | INTEGER DEFAULT 0 | |
| ai_generated | BOOLEAN DEFAULT false | |
| trigger_type | TEXT | 'manual', 'automated', 'cross_module' |
| is_ab_test | BOOLEAN DEFAULT false | |
| ab_variant_b_subject | TEXT | |
| ab_variant_b_content_html | TEXT | |
| ab_test_size_pct | INTEGER | |
| ab_winning_metric | TEXT | 'open_rate', 'click_rate' |
| ab_evaluation_hours | INTEGER | |
| ab_winner | TEXT | 'a', 'b', null |
| created_by | UUID (FK) | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**`marketing_templates`** — Herbruikbare templates

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | UUID (PK) | |
| location_id | UUID (FK, nullable) | NULL = platform-breed |
| template_type | TEXT | |
| name | TEXT | |
| category | TEXT | 'welcome', 'birthday', 'winback', 'promotion', 'event', 'seasonal', 'review_request', 'custom' |
| content_html | TEXT | |
| thumbnail_url | TEXT | |
| is_system | BOOLEAN DEFAULT false | |
| is_active | BOOLEAN DEFAULT true | |
| created_at | TIMESTAMPTZ | |

**`marketing_segments`** — Doelgroep segmenten

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | UUID (PK) | |
| location_id | UUID (FK) | |
| name | TEXT | |
| description | TEXT | |
| filter_rules | JSONB | Zie filter_rules structuur hieronder |
| is_dynamic | BOOLEAN DEFAULT true | |
| guest_count | INTEGER | |
| guest_count_updated_at | TIMESTAMPTZ | |
| is_system | BOOLEAN DEFAULT false | |
| created_at | TIMESTAMPTZ | |

**Filter rules:** `{ "conditions": [{ "field": "total_visits", "operator": "gte", "value": 3 }], "logic": "AND" }`

**Systeem-segmenten:** Nieuwe gasten, Reguliere gasten, VIP, At-risk, Verloren, Verjaardagen.

**`marketing_automation_flows`** — Automatische flows

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | UUID (PK) | |
| location_id | UUID (FK) | |
| name | TEXT | |
| flow_type | TEXT | |
| trigger_config | JSONB | |
| steps | JSONB | |
| is_active | BOOLEAN DEFAULT true | |
| template_id | UUID (FK, nullable) | |
| stats | JSONB | `{ total_triggered, total_sent, total_converted }` |
| created_at | TIMESTAMPTZ | |

**Default flows:** Welkomst, Verjaardag, Win-back 30d/60d/90d, Post-visit review.

**`marketing_campaign_analytics`** — Per-campagne metrics

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | UUID (PK) | |
| campaign_id | UUID (FK) | |
| location_id | UUID (FK) | |
| channel | TEXT | |
| sent_count | INTEGER DEFAULT 0 | |
| delivered_count | INTEGER DEFAULT 0 | |
| opened_count | INTEGER DEFAULT 0 | |
| clicked_count | INTEGER DEFAULT 0 | |
| bounced_count | INTEGER DEFAULT 0 | |
| unsubscribed_count | INTEGER DEFAULT 0 | |
| reservations_attributed | INTEGER DEFAULT 0 | |
| revenue_attributed | NUMERIC DEFAULT 0 | |
| social_impressions | INTEGER DEFAULT 0 | |
| social_reach | INTEGER DEFAULT 0 | |
| social_engagement | INTEGER DEFAULT 0 | |
| social_saves | INTEGER DEFAULT 0 | |
| updated_at | TIMESTAMPTZ | |

**`marketing_contact_preferences`** — GDPR consent

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | UUID (PK) | |
| customer_id | UUID (FK) | |
| location_id | UUID (FK) | |
| channel | TEXT | 'email', 'sms', 'whatsapp', 'push' |
| opted_in | BOOLEAN DEFAULT false | |
| opted_in_at | TIMESTAMPTZ | |
| opted_out_at | TIMESTAMPTZ | |
| consent_source | TEXT | 'widget', 'website_popup', 'in_store', 'import', 'manual' |
| double_opt_in_confirmed | BOOLEAN DEFAULT false | |
| double_opt_in_token | TEXT | |
| double_opt_in_sent_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

**Constraints:** UNIQUE(customer_id, location_id, channel)

**`marketing_content_ideas`** — AI content suggesties

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | UUID (PK) | |
| location_id | UUID (FK) | |
| idea_type | TEXT | |
| source | TEXT | 'calendar', 'cross_module_event', 'seasonal', 'brand_intelligence' |
| source_event_id | UUID (FK, nullable) | |
| title | TEXT | |
| description | TEXT | |
| suggested_content | JSONB | |
| suggested_date | DATE | |
| priority | INTEGER | |
| status | TEXT | 'suggested', 'accepted', 'dismissed', 'converted' |
| created_at | TIMESTAMPTZ | |

### Social tabellen (Sprint 2)

**`marketing_social_posts`**

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | UUID (PK) | |
| location_id | UUID (FK) | |
| campaign_id | UUID (FK, nullable) | |
| platform | TEXT | |
| post_type | TEXT | 'feed', 'reel', 'carousel', 'google_post' |
| content_text | TEXT | |
| hashtags | TEXT[] | |
| media_urls | TEXT[] | |
| status | TEXT | 'draft', 'scheduled', 'published', 'failed', 'imported' |
| scheduled_at | TIMESTAMPTZ | |
| published_at | TIMESTAMPTZ | |
| external_post_id | TEXT | |
| is_recurring | BOOLEAN DEFAULT false | |
| recurrence_rule | JSONB | |
| ai_generated | BOOLEAN DEFAULT false | |
| alternative_caption | TEXT | Voor caption learning |
| content_type_tag | TEXT | 'food_shot', 'behind_the_scenes', 'team', 'ambiance', 'seasonal', 'promo' |
| analytics | JSONB | |
| created_by | UUID (FK) | |
| created_at | TIMESTAMPTZ | |

**`marketing_social_accounts`**

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | UUID (PK) | |
| location_id | UUID (FK) | |
| platform | TEXT | |
| account_name | TEXT | |
| account_id | TEXT | |
| access_token | TEXT | Encrypted |
| refresh_token | TEXT | Encrypted |
| token_expires_at | TIMESTAMPTZ | |
| page_id | TEXT | Facebook Page ID |
| is_active | BOOLEAN DEFAULT true | |
| created_at | TIMESTAMPTZ | |

**`marketing_popup_config`** — Website popup configuratie

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | UUID (PK) | |
| location_id | UUID (FK, UNIQUE) | |
| exit_intent_enabled | BOOLEAN DEFAULT false | |
| timed_popup_enabled | BOOLEAN DEFAULT false | |
| timed_popup_delay_seconds | INTEGER DEFAULT 15 | |
| sticky_bar_enabled | BOOLEAN DEFAULT false | |
| sticky_bar_position | TEXT DEFAULT 'bottom' | 'top' of 'bottom' |
| headline_text | TEXT DEFAULT 'Blijf op de hoogte!' | |
| description_text | TEXT | |
| button_text | TEXT DEFAULT 'Aanmelden' | |
| success_text | TEXT DEFAULT 'Bedankt voor je aanmelding!' | |
| is_active | BOOLEAN DEFAULT true | Master toggle |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### Intelligence tabellen (Sprint 3)

**`marketing_brand_intelligence`** — Lerend profiel per locatie

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | UUID (PK) | |
| location_id | UUID (FK, UNIQUE) | |
| content_type_performance | JSONB | Gemiddelde engagement per content type |
| optimal_post_times | JSONB | Beste uur per dag |
| top_hashtag_sets | JSONB | Best presterende combinaties |
| caption_style_profile | TEXT | LLM-samenvatting schrijfstijl |
| visual_style_profile | TEXT | LLM-samenvatting foto-stijl (intern, niet in UI) |
| engagement_baseline | JSONB | Gemiddelden |
| weekly_best_content_type | TEXT | |
| learning_stage | TEXT | 'onboarding', 'learning', 'optimizing', 'mature' |
| posts_analyzed | INTEGER DEFAULT 0 | |
| current_weekplan | JSONB | Laatst gegenereerde weekplan |
| last_analysis_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

Learning stages: onboarding (0 posts) → learning (1-15) → optimizing (16-50) → mature (50+)

**`marketing_coaching_tips`** — Engagement coaching

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | UUID (PK) | |
| location_id | UUID (FK) | |
| tip_type | TEXT | 'performance', 'timing', 'content_mix', 'growth', 'warning' |
| title | TEXT | |
| description | TEXT | |
| priority | INTEGER | |
| status | TEXT | 'active', 'dismissed' |
| created_at | TIMESTAMPTZ | |

Max 3 actieve tips tegelijk. Positieve, actionable toon. Geen technische termen.

**`marketing_content_series`** — Optioneel, voor power users

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | UUID (PK) | |
| location_id | UUID (FK) | |
| name | TEXT | |
| description | TEXT | |
| frequency | TEXT | 'weekly', 'biweekly', 'monthly' |
| preferred_day | TEXT | |
| content_type | TEXT | |
| template_prompt | TEXT | |
| episode_count | INTEGER DEFAULT 0 | |
| is_active | BOOLEAN DEFAULT true | |
| created_at | TIMESTAMPTZ | |

**`marketing_reviews`** — Reviews van externe platforms

| Kolom | Type | Beschrijving |
|-------|------|-------------|
| id | UUID (PK) | |
| location_id | UUID (FK) | |
| platform | TEXT | |
| external_review_id | TEXT | |
| author_name | TEXT | |
| rating | FLOAT | |
| review_text | TEXT | |
| review_date | TIMESTAMPTZ | |
| response_text | TEXT | |
| ai_suggested_response | TEXT | |
| sentiment | TEXT | |
| sentiment_aspects | JSONB | |
| is_featured | BOOLEAN DEFAULT false | |
| created_at | TIMESTAMPTZ | |

### RLS Policies

Alle marketing tabellen volgen het standaard Nesto location-based RLS pattern.

### Aanpassingen aan bestaande tabellen

**`customers`** — controleer/voeg toe: email, phone_number, total_visits, last_visit_date, no_show_count, average_spend, tags (JSONB!), birthday, dietary_preferences

**`locations`** — voeg toe: google_place_id, tripadvisor_url

---

## Edge Functions

| Function | Trigger | Beschrijving |
|----------|---------|-------------|
| `marketing-send-email` | Campagne verzending | Resend batch, personalisatie, suppressie |
| `marketing-process-automation` | pg_cron 15 min | Flow triggers evalueren, emails verzenden |
| `marketing-attribution` | pg_cron dagelijks 02:00 | Revenue attributie (7d 50%, 30d 25%) |
| `marketing-confirm-optin` | Publiek endpoint | Double opt-in token validatie |
| `marketing-publish-social` | Post publicatie | Instagram 2-staps, Facebook, Google |
| `marketing-generate-content` | On demand | Laag 2 (Sonnet), met Brand Intelligence profiel |
| `marketing-refresh-tokens` | pg_cron dagelijks | Social OAuth token refresh |
| `marketing-popup-config` | Publiek GET | Popup config + brand kleuren ophalen |
| `marketing-popup-subscribe` | Publiek POST | Opt-in verwerking, rate limit 10/IP/uur |
| `marketing-analyze-brand` | pg_cron wekelijks zo 05:00 | SQL analyse + LLM stijlprofiel opbouwen |
| `marketing-onboard-instagram` | Na OAuth koppeling | 30 posts analyseren, profiel opbouwen |
| `marketing-generate-weekplan` | pg_cron maandag 06:00 | AI weekplan genereren |
| `marketing-generate-coaching` | Na wekelijkse analyse | Max 3 tips genereren |
| `marketing-generate-ideas` | pg_cron dagelijks 06:00 | Content ideeën + cross-module events |
| `marketing-sync-reviews` | pg_cron 6 uur | Google reviews + sentiment |
| `marketing-sync-social-stats` | pg_cron 4 uur | Social metrics ophalen |
| `marketing-refresh-google-posts` | pg_cron dagelijks 08:00 | Herplaats na 6 dagen |
| `marketing-evaluate-ab-test` | pg_cron elk uur | A/B test winnaar bepalen |

---

## Brand Intelligence Engine

### Hoe het werkt

Het systeem leert continu van content en performance. De complexiteit zit onder de motorkap — de operator ziet alleen resultaten.

**Bij Instagram koppeling (eenmalig):**
1. Haal laatste 30 posts op met insights
2. Classificeer content type per post (Laag 1)
3. Analyseer visuele stijl (Laag 2, vision) — intern, niet getoond
4. Analyseer caption stijl (Laag 2) — samenvatting voor content generatie
5. Bouw initieel profiel op (SQL analyse)
6. Toon simpele feedback: "We kennen je stijl. Suggesties worden elke week beter."

**Wekelijks (automatisch):**
1. SQL: content type performance, optimale tijden, hashtag sets, baseline
2. LLM: caption stijlprofiel updaten op basis van laatste 20 captions
3. Learning stage updaten

**Bij content generatie:**
Het volledige profiel (schrijfstijl, visuele stijl, performance data, timing, hashtags) wordt meegegeven als context aan de LLM. Resultaat: captions die klinken alsof de restaurateur ze zelf schreef.

**Cross-platform optimalisatie:**
Eén content-idee wordt per platform anders geschreven:
- Instagram: kort, visueel, hashtags, emoji's
- Facebook: langer, meer context, link naar reservering
- Google Business: zakelijk, CTA, openingstijden

### Weekplan

Elke maandag genereert het systeem een complete weekplanning (3-5 posts) op basis van:
- Optimale posttijden
- Content type afwisseling
- Kalender events
- Cross-module events
- Recente posts (geen herhaling)

Dashboard toont: "📅 Je weekplan staat klaar" met "Alles inplannen" (1 klik) of "Aanpassen".

### Engagement Coaching

Max 3 tips tegelijk. Positief, actionable. Geen technische termen.

Voorbeelden:
- "Je behind-the-scenes posts werken goed — probeer er 2 per week."
- "Vrijdag is je sterkste dag. Zorg dat je dan altijd een post hebt."
- "🎉 Je post van dinsdag is je best presterende ooit."

---

## Website Popup & Sticky Bar

Embeddable JavaScript widget voor email opt-in op de restaurant website.

**3 types:** Exit-intent popup (desktop), timed popup (desktop+mobile), sticky bar (desktop+mobile).

**Technisch:** Shadow DOM (geen CSS conflicten), publieke endpoints, brand kit kleuren, GDPR tekst, double opt-in support, rate limiting.

**Embed:** `<script src="https://[url]/functions/v1/marketing-popup-widget/[slug]"></script>`

---

## Kosten-inschatting per restaurant per maand

| Feature | Model | Kosten |
|---------|-------|--------|
| Content ideeën | Laag 2 (Sonnet) | €0.10-0.30 |
| Social captions | Laag 2 (Sonnet) | €0.10-0.30 |
| Email content | Laag 2 (Sonnet) | €0.05-0.15 |
| Brand analyse (wekelijks) | Laag 2 + vision | €0.20-0.50 |
| Review sentiment | Laag 2 (Sonnet) | €0.05-0.20 |
| Weekplan generatie | Laag 2 (Sonnet) | €0.10-0.20 |
| Coaching tips | Laag 1 (goedkoop) | €0.01-0.05 |
| **Totaal AI** | | **€0.60-1.70** |
| Resend (email) | | €0-20 gedeeld |
| Social APIs | | Gratis |
| **Totaal** | | **~€3-5 per restaurant** |

---

## Wat dit NIET doet

- Automatische prijswijzigingen
- Social media advertenties (Meta Ads, Google Ads)
- Influencer outreach
- Website/landingpage builder
- Loyalty punten systeem
- WhatsApp marketing (zie AI_FEATURE_6_WHATSAPP.md)
- Concurrentie-analyse (later)

---

## Afhankelijkheden

| Feature | Vereist | Status |
|---------|---------|--------|
| Email campagnes | customers + reservations | Fase 4.6 |
| Guest Widget opt-in | Guest Widget | Fase 4.10 ✅ |
| Menu-item blokken | menu_items tabel | Fase 6 |
| Cross-module keuken | Keukenmodule | Fase 5 |
| Review management | Google Place ID | Sprint 3 |
| Social posting | OAuth tokens | Sprint 2 |
| Brand Intelligence | Instagram koppeling | Sprint 2+3 |

---

## Implementatie

Zie `MARKETING_SPRINT_PLAN.md` voor het complete stap-voor-stap build plan met 24 Lovable sessies over 4 sprints.

---

## Sprint Status

- Sprint 1 (1.1-1.9): AFGEROND — Foundation + Email
- Sprint 2 (2.1-2.6): AFGEROND — Social + Kalender + Popup
- Sprint 3 (3.1-3.6): AFGEROND — Brand Intelligence + Reviews + Learning Cycle + Email Verrijking
- Sprint 3.5b: AFGEROND — Review Response Learning + Google Reply fix
- Sprint 4 (4.1-4.4): AFGEROND — Analytics + A/B Testing + Polish

---

*Dit document wordt geraadpleegd bij elke Lovable sessie die marketing-features bouwt. v2 — 22 februari 2026*
