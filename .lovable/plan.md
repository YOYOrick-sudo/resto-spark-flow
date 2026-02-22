
# Sessie 1.5 — Email Verzending + Automation Engine

## Status: ✅ AFGEROND

### Wat is gebouwd:

#### Database
- [x] `marketing_email_log` tabel met indexen voor suppressie en webhook lookups
- [x] `increment_marketing_analytics` RPC voor atomische analytics updates
- [x] Unique index op `marketing_campaign_analytics(campaign_id, channel)` voor upsert
- [x] `pg_cron` en `pg_net` extensies geactiveerd

#### Edge Functions
- [x] `marketing-send-email` — campagne verzending met batch modus, consent/suppressie filtering, personalisatie, unsubscribe links
- [x] `marketing-email-webhook` — Resend webhook tracking (delivered, opened, clicked, bounced, complained)
- [x] `marketing-process-automation` — automation engine (welcome, birthday, winback, post_visit_review)

#### pg_cron Jobs
- [x] `marketing-send-scheduled` — elke 5 min, vindt due scheduled campaigns
- [x] `marketing-process-automation` — elke 15 min, verwerkt automation flows

---

# Sessie 1.5b — Reserveringen ↔ Marketing Integratie

## Status: ✅ AFGEROND

### Wat is gebouwd:

#### Database Triggers
- [x] `notify_marketing_on_reservation_change()` — INSERT cross_module_events bij status→completed/no_show/cancelled
- [x] `notify_marketing_on_customer_milestone()` — INSERT cross_module_events bij total_visits = 1/3/10

#### Database Functies
- [x] `detect_empty_shifts()` — PL/pgSQL functie die shifts met <40% bezetting detecteert

#### pg_cron Jobs
- [x] `detect-empty-shifts` — dagelijks 16:00 UTC
- [x] `cross-module-events-cleanup` — dagelijks 03:00 UTC, verwijdert verlopen events

#### Widget Opt-in
- [x] `marketing_optin` veld toegevoegd aan BookingContext GuestData
- [x] Opt-in checkbox in GuestDetailsStep (default UIT)
- [x] `public-booking-api` handleBook verwerkt marketing_optin:
  - INSERT marketing_contact_preferences met consent_source='widget'
  - Double opt-in email als brand_kit.double_opt_in_enabled = true
  - Direct opted_in=true als double_opt_in_enabled = false

#### Edge Functions
- [x] `marketing-confirm-optin` — publiek GET endpoint voor double opt-in bevestiging met HTML bedankpagina
- [x] `marketing-process-automation` uitgebreid met cross_module_events consumptie:
  - `guest_first_visit` → trigger welcome flow
  - `guest_visit_completed` → trigger post_visit_review flow (3u delay)
  - Events gemarkeerd als consumed via consumed_by JSONB array

### Tests
- `marketing-confirm-optin`: "Ongeldige link" bij onbekend token ✅
- `marketing-process-automation`: `{"processed":0,"sent":0}` ✅

### Notities
- Welcome flow nu getriggerd via cross_module_events (guest_first_visit) i.p.v. directe customer queries
- detect_empty_shifts skipt shifts zonder shift_tickets (geen capaciteitsberekening mogelijk)
- 3u delay voor post_visit_review: events worden pas opgepikt als created_at + 3u <= now()

---

# Sessie 1.6 — Marketing Dashboard + Basis Analytics

## Status: ✅ AFGEROND

### Wat is gebouwd:

#### Navigatie
- [x] Marketing sub-items uitgebreid: Dashboard, Campagnes, Segmenten, Contacten, Analytics
- [x] Routes toegevoegd: `/marketing` (Dashboard) en `/marketing/analytics`

#### Marketing Dashboard (`/marketing`)
- [x] 4 KPI tiles (Polar.sh-stijl):
  - Marketing omzet (sparkline, tooltip met €35/gast disclaimer, min 7 datapunten check)
  - Gasten bereikt (unieke ontvangers)
  - At-risk gasten (rood accent >10, "Win-back sturen" CTA)
  - Actieve flows (count + namen, link naar settings)
- [x] Recente campagnes tabel (NestoTable, laatste 5)
- [x] Activiteit timeline (laatste 10 acties)

#### Marketing Analytics (`/marketing/analytics`)
- [x] Periode selector (7d/30d/90d) via NestoOutlineButtonGroup
- [x] Revenue hero getal met tooltip disclaimer
- [x] Email metrics lijn grafiek (Recharts: Verzonden, Geopend, Geklikt)
- [x] Campagne prestaties tabel (sorteerbaar op omzet)

#### Edge Function
- [x] `marketing-attribution` — lookback attributie engine (7d=50%, 30d=25%)
- [x] pg_cron: dagelijks 02:00 UTC

### Notities
- Revenue berekend als party_size × €35 (geschat). Tooltip bij elk revenue getal meldt dit.
- Sparkline toont alleen bij 7+ datapunten met waarde >0, anders alleen het getal.
- UTM direct-click attributie (100%) genoteerd als toekomstige uitbreiding.
