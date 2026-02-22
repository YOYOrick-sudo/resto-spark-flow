

# Fase 4.11 — Wachtlijst + Auto-Invites

Dit is een groot feature met 3 rondes. We starten met **Ronde 1: Database + Edge Functions** — het fundament waarop de UI (Ronde 2) en integratie (Ronde 3) worden gebouwd.

---

## Ronde 1: Database + Edge Functions

### 1A. Database migratie (3 tabellen + RLS)

**Tabel `waitlist_settings`** (1 rij per locatie)
- `location_id` (PK, FK locations)
- `waitlist_enabled`, `auto_invite_enabled`, `auto_invite_delay_minutes` (default 5)
- `invite_window_minutes` (default 30), `max_parallel_invites` (default 1)
- `priority_mode` (auto/manual) via validation trigger
- RLS: location-scoped via `user_has_location_access`

**Tabel `waitlist_entries`**
- Core: `location_id`, `date`, `party_size`, `first_name`, `last_name`, `email`
- Optioneel: `customer_id`, `shift_id`, `ticket_id`, `phone`, `notes`
- Tijdvoorkeur: `preferred_time_from`, `preferred_time_to`
- Status via validation trigger: pending, invited, converted, expired, cancelled
- `priority_score` (default 0), timestamps
- RLS: location-scoped

**Tabel `waitlist_invites`**
- FK naar `waitlist_entry_id`, `location_id`, `ticket_id`, `reservation_id` (nullable)
- `slot_date`, `slot_time`, `party_size`
- `invite_token` (UNIQUE, crypto.randomUUID)
- Status: sent, accepted, expired, declined (validation trigger)
- `expires_at`, `accepted_at`
- RLS: location-scoped

### 1B. Edge Function: `waitlist-invite-engine`

Aangeroepen na een annulering. Logica:
1. Check `waitlist_settings` — enabled + auto_invite
2. Als `auto_invite_delay_minutes > 0`: wacht (via setTimeout in de edge function)
3. Run availability check op het vrijgekomen slot (hergebruik `loadEngineData` + `checkAvailabilityEngine` uit `_shared/availabilityEngine.ts`)
4. Zoek matching `waitlist_entries` (status=pending, date match, party_size past, tijdvoorkeur overlapt)
5. Bereken `priority_score` (returning guest +10, exact time +5, exact party +3, ticket match +2)
6. Neem top N (`max_parallel_invites`)
7. Per match: maak `waitlist_invite` aan, update entry status naar 'invited', stuur invite email via Resend (zelfde pattern als `sendBookingConfirmationEmail`)
8. Log in `audit_log`

**Trigger**: Na annulering in `public-booking-api/index.ts` (handleManagePost cancel branch) en in `transition_reservation_status` RPC wordt een HTTP call naar deze function gedaan.

### 1C. Edge Function: `waitlist-accept`

POST endpoint met `token` parameter. Logica:
1. Zoek `waitlist_invite` op `invite_token`
2. Valideer: status=sent EN expires_at > now()
3. Run availability check opnieuw (atomisch)
4. Als beschikbaar: `create_reservation` RPC, update invite (accepted), update entry (converted), stuur confirmation email
5. Als niet beschikbaar: invite naar expired, entry terug naar pending, return foutmelding
6. Audit log entries

### 1D. Wachtlijst route in `public-booking-api`

Nieuwe POST route `waitlist` in de bestaande router:
- Valideert input (location_id via slug, date, party_size, naam, email)
- Find/create customer (zelfde pattern als booking)
- Insert `waitlist_entry`
- Stuur bevestigingsmail "Je staat op de wachtlijst"
- Return success

### 1E. Cancel trigger integratie

In `public-booking-api` na succesvolle cancel: HTTP call naar `waitlist-invite-engine` met location_id, date, start_time, party_size, shift_id, ticket_id.

---

## Ronde 2: Widget + Operator UI

### 2A. Widget: Wachtlijst CTA

In `SelectionStep` component (booking widget):
- Detecteer wanneer alle slots unavailable zijn voor de gekozen datum
- Toon "Helaas volgeboekt" + "Zet me op de wachtlijst" knop
- Klik opent inline formulier: party_size + datum (pre-filled), tijdvoorkeur (dropdown), naam/email/telefoon, opmerkingen
- Submit naar `public-booking-api/waitlist`
- Bevestigingsscherm: "Je staat op de wachtlijst!"

### 2B. Widget: Accept pagina

Nieuwe route `/waitlist/accept/:token`:
- Laad invite data via nieuwe GET endpoint in `waitlist-accept`
- Toon: restaurant info, datum, tijd, gasten, ticket
- CTA: "Reserveer nu" — POST naar `waitlist-accept`
- Verlopen: "Deze uitnodiging is verlopen. Je staat weer op de wachtlijst."
- Succes: zelfde confirmation als normale booking

### 2C. Operator UI: Wachtlijst tab

ViewToggle uitbreiden: `list | grid | calendar` wordt `list | grid | waitlist | calendar`
- Nieuwe `WaitlistView` component
- Lijst van entries voor geselecteerde datum
- Status badges: Wachtend (geel), Uitgenodigd + countdown (blauw), Geboekt (groen), Verlopen (grijs)
- Filters: datum, status
- Acties: handmatig uitnodigen (kies slot), annuleren
- Bij priority_mode=manual: drag-and-drop volgorde

### 2D. Settings UI

Nieuwe sectie in Settings > Reserveringen:
- Toggle: Wachtlijst inschakelen
- Toggle: Automatisch uitnodigen
- Delay (minuten), geldigheid (minuten), gelijktijdige invites, prioriteitmodus

---

## Ronde 3: Signals + Cron + Polish

### 3A. WaitlistSignalProvider

Nieuwe signal types in de evaluate-signals edge function:
- "X gasten op de wachtlijst voor vandaag"
- "Uitnodiging verlopen — nog X wachtend"
- "Wachtlijst-conversie: [naam] heeft geboekt!"
- "Wachtlijst groeit — overweeg extra shift"
- "Hoge no-show kans + wachtlijst match" (killer feature)

### 3B. Auto-expire cron job

pg_cron elke 5 minuten:
- Verlopen invites (sent + expires_at < now) naar expired, entry terug naar pending, trigger invite engine
- Verlopen entries (date < today + pending) naar expired, stuur "helaas" email

### 3C. Audit trail

Alle acties loggen: entry_created, invite_sent, invite_accepted, invite_expired, entry_converted, entry_cancelled.

---

## Technische details

| Onderdeel | Bestanden |
|---|---|
| Database migratie | 1 SQL migratie (3 tabellen, triggers, RLS policies) |
| waitlist-invite-engine | `supabase/functions/waitlist-invite-engine/index.ts` |
| waitlist-accept | `supabase/functions/waitlist-accept/index.ts` |
| public-booking-api uitbreiding | `supabase/functions/public-booking-api/index.ts` (waitlist route + cancel trigger) |
| Widget wachtlijst CTA | `src/components/booking/SelectionStep.tsx` + `WaitlistForm.tsx` |
| Widget accept pagina | `src/pages/WaitlistAccept.tsx` + route in router |
| Operator wachtlijst tab | `src/components/reserveringen/WaitlistView.tsx` |
| ViewToggle | `src/components/reserveringen/ViewToggle.tsx` (type uitbreiden) |
| Settings UI | Bestaande settings pagina uitbreiden |
| Hooks | `src/hooks/useWaitlist.ts`, `src/hooks/useWaitlistSettings.ts` |
| Types | `src/types/waitlist.ts` |
| Signals | `supabase/functions/evaluate-signals/index.ts` uitbreiden |
| Cron | pg_cron job insert |

### Aanpak

We bouwen dit in 3 afzonderlijke sessies (Ronde 1, 2, 3). **Nu starten we met Ronde 1**: database migratie + de twee edge functions + public-booking-api uitbreiding. Dat is het fundament.

