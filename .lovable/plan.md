

# Fase 4.10 — Publieke Booking Widget

## Status Overzicht

| Stap | Beschrijving | Status |
|------|-------------|--------|
| 1 | Database Migratie (widget_settings + reservations.tags) | ✅ AFGEROND |
| 2 | Public Booking API Edge Function (7 endpoints) | ✅ AFGEROND |
| 3 | Widget Frontend (4-staps booking flow) | ⬜ TODO |
| 4 | Widget Settings UI (beheer pagina) | ⬜ TODO |
| 5 | Embed & Hosting (routes, iframe code) | ⬜ TODO |

---

## Stap 1: Database Migratie ✅

- `widget_settings` tabel met RLS, validation triggers, updated_at trigger
- `reservations.tags` kolom (JSONB, default `[]`)
- Booking questions target-mapping: `customer_tags` → `customers.tags`, `reservation_tags` → `reservations.tags`

## Stap 2: Public Booking API ✅

Edge Function: `public-booking-api` met 7 endpoints:

| Endpoint | Methode | Doel |
|----------|---------|------|
| `/config` | GET | Widget config via slug |
| `/availability` | POST | Slots voor datum + party_size |
| `/availability/month` | POST | Beschikbare dagen in maand |
| `/guest-lookup` | POST | Returning guest op email (5 req/min) |
| `/book` | POST | Reservering aanmaken (honeypot + 10 req/min) |
| `/manage` | GET | Reservering ophalen via manage_token |
| `/manage` | POST | Annuleren via manage_token + policy check |

Hergebruikt: `loadEngineData()` uit `_shared/availabilityEngine.ts`

## Stap 3: Widget Frontend (TODO)

- 4-staps flow: Datum → Tijd → Gegevens → Bevestiging
- System font stack, responsive
- White-label: kleuren uit widget_settings
- "Powered by Nesto" alleen op bevestigingspagina
- Booking questions in stap 3

## Stap 4: Widget Settings UI (TODO)

- Settings pagina onder Reserveringen → Instellingen → Widget
- Slug, branding, booking questions configuratie
- Embed code preview (hosted URL + iframe)

## Stap 5: Embed & Hosting (TODO)

- Route: `/book/{slug}`
- iframe embed code generator
- Direct link

---

## Doorlopende Targets

- Performance: < 2 sec TTI, Lighthouse > 90, < 100KB widget bundle, < 45 sec booking flow
- SEO: Open Graph + JSON-LD per restaurant slug (later)
- Acceptance criteria: 10 testvragen na implementatie
