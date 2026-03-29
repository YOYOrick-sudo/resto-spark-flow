

# Sprint: Waitlist R3 + Email Templates + Reminders + Squeeze Caps

Vier onderdelen, waarvan squeeze caps al gebouwd is (gratis).

---

## Huidige staat

- **Waitlist R1+R2**: compleet (tabellen, edge functions, trigger, widget, operator UI, settings)
- **evaluate-signals**: 4 providers (config, onboarding, noshow_risk, marketing) — geen waitlist provider
- **SettingsCommunicatie**: Gastberichten tab is placeholder (disabled, EmptyState)
- **reservations tabel**: mist `reconfirmed_at`, `reconfirm_token`, `reminder_24h_sent_at`, `reminder_3h_sent_at`, `reconfirm_sent_at`
- **reservation_settings**: mist reminder/reconfirm kolommen
- **Geen** `reservation_email_templates` tabel
- **Reconfirm in policy_sets**: `reconfirm_enabled`, `reconfirm_hours_before`, `reconfirm_required` bestaan al — de reminder engine kan deze per-ticket config gebruiken
- **ReservationBadges**: toont al "Herbevestigd" badge wanneer `reconfirmed_at` gezet is

---

## 1. Database migratie

Eén migratie met alles:

**Nieuwe tabel `reservation_email_templates`:**
- `id`, `location_id` (FK), `template_key` (text), `subject`, `body`, `is_active` (default true), `created_at`, `updated_at`
- UNIQUE(location_id, template_key)
- template_key values: `confirmation`, `waitlist_confirmation`, `waitlist_invite`, `cancellation`, `reminder_24h`, `reminder_3h`, `reconfirm`
- RLS: location-scoped via `user_has_location_access`

**Kolommen op `reservations`:**
- `reminder_24h_sent_at` timestamptz nullable
- `reminder_3h_sent_at` timestamptz nullable
- `reconfirm_sent_at` timestamptz nullable
- `reconfirmed_at` timestamptz nullable
- `reconfirm_token` text nullable

**Kolommen op `reservation_settings`:**
- `reminder_24h_enabled` boolean DEFAULT true
- `reminder_3h_enabled` boolean DEFAULT true
- `reconfirm_enabled` boolean DEFAULT false
- `reconfirm_min_risk_score` integer DEFAULT 60

---

## 2. Waitlist Ronde 3

### A) `waitlist-auto-expire` Edge Function (nieuw)

Elke 5 min via pg_cron:
1. Expire invites: `waitlist_invites` WHERE status='sent' AND expires_at < NOW() → status='expired'
2. Reset entries: bijbehorende `waitlist_entries` terug naar 'pending'
3. Expire oude entries: `waitlist_entries` WHERE date < CURRENT_DATE AND status='pending' → status='expired'
4. Per affected location_id+date: roep `waitlist-invite-engine` aan (next-in-line)
5. Audit log entries voor expires

### B) WaitlistSignalProvider in `evaluate-signals`

Nieuwe provider toevoegen aan de providers array:
- "X gasten op wachtlijst voor vandaag" (info, count > 0)
- "Uitnodiging verlopen — nog X wachtend" (warning)
- "Wachtlijst-conversie: [naam] heeft geboekt!" (ok)
- "Hoge no-show kans + wachtlijst match" (warning, no_show_risk_score >= 60 + matching pending entry)
- **Nieuw (user feedback):** "Niet herbevestigd + wachtlijst match beschikbaar" (warning, reconfirm_sent_at IS NOT NULL AND reconfirmed_at IS NULL AND sent > 12h ago + matching waitlist entry)

### C) Audit log in waitlist edge functions

Toevoegen aan `waitlist-invite-engine`: `waitlist_invite_sent`, `waitlist_entry_cancelled`
Toevoegen aan `waitlist-accept`: `waitlist_entry_converted` (naast bestaande `waitlist_invite_accepted`)

---

## 3. Email Templates Editor

### Gastberichten tab activeren in `SettingsCommunicatie.tsx`
- Remove `disabled: true` van gastberichten tab
- Replace EmptyState met `GastberichtenTab` component

### `GastberichtenTab.tsx` (nieuw)
- Lijst van template cards per template_key
- Per template: subject input, body textarea
- Merge fields helper: `{voornaam}`, `{achternaam}`, `{datum}`, `{tijd}`, `{gasten}`, `{restaurant}`, `{beheerlink}`, `{ticket}`
- Preview knop met voorbeeld-data in modal
- Reset naar standaard knop (hardcoded defaults)
- Reminder toggles sectie onderaan:
  - T-24h reminder: aan/uit
  - T-3h reminder: aan/uit
  - Reconfirm: aan/uit + drempel (risicoscore slider/input)

### `useReservationEmailTemplates.ts` (nieuw)
- CRUD hook voor `reservation_email_templates` per location_id

### Backend template lookup
- `public-booking-api`, `waitlist-invite-engine`, `waitlist-accept`: fetch template uit `reservation_email_templates` met fallback naar huidige hardcoded HTML

---

## 4. Reminder + Reconfirm

### `reservation-reminders` Edge Function (nieuw)
Elke 15 min via pg_cron:
1. T-24h: reserveringen voor morgen WHERE reminder_24h_sent_at IS NULL AND status IN ('confirmed','option') → stuur email, set reminder_24h_sent_at
2. T-3h: reserveringen komende 3 uur WHERE reminder_3h_sent_at IS NULL → stuur email, set reminder_3h_sent_at
3. Reconfirm: reserveringen met no_show_risk_score >= threshold WHERE reconfirm_sent_at IS NULL → genereer reconfirm_token, stuur email met link, set reconfirm_sent_at
4. Respecteert per-locatie settings (`reminder_24h_enabled`, etc.) en per-ticket policy_set reconfirm config

### Public route `/reconfirm/:token`
- `ReconfirmReservation.tsx`: fetch reservation via token, toon "Bevestig je reservering", POST → update reconfirmed_at
- Eenvoudige branded pagina (restaurant naam, datum/tijd, checkmark na bevestiging)

### Operator-kant (user feedback #1)
- `ReservationBadges.tsx`: toont al "Herbevestigd" badge — **werkt automatisch** zodra `reconfirmed_at` kolom bestaat
- `ReservationDetailPanel.tsx`: toon "Herbevestigd om {timestamp}" onder status badge wanneer `reconfirmed_at` gezet is
- Grid/List view: de badge is al zichtbaar via `ReservationBadges` component

---

## 5. Squeeze Caps

Geen werk nodig — al volledig geïmplementeerd in `check-availability`, `public-booking-api`, en `waitlist-invite-engine`.

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| SQL migratie | `reservation_email_templates` + reservations kolommen + reservation_settings kolommen |
| `supabase/functions/waitlist-auto-expire/index.ts` | **Nieuw** — cron expire handler |
| `supabase/functions/evaluate-signals/index.ts` | Waitlist provider toevoegen |
| `supabase/functions/waitlist-invite-engine/index.ts` | Audit log + template lookup |
| `supabase/functions/waitlist-accept/index.ts` | Audit log + template lookup |
| `supabase/functions/reservation-reminders/index.ts` | **Nieuw** — T-24h, T-3h, reconfirm |
| `supabase/functions/public-booking-api/index.ts` | Template lookup |
| `src/pages/settings/SettingsCommunicatie.tsx` | Gastberichten tab activeren |
| `src/components/settings/communication/GastberichtenTab.tsx` | **Nieuw** — template editor + reminder toggles |
| `src/hooks/useReservationEmailTemplates.ts` | **Nieuw** |
| `src/pages/ReconfirmReservation.tsx` | **Nieuw** — public bevestigingspagina |
| `src/components/reservations/ReservationDetailPanel.tsx` | Reconfirmed timestamp tonen |
| `src/App.tsx` | Route `/reconfirm/:token` toevoegen |
| pg_cron inserts (2x) | waitlist-auto-expire elke 5 min, reservation-reminders elke 15 min |

## Volgorde

1. DB migratie (alles in één)
2. `waitlist-auto-expire` + pg_cron
3. `evaluate-signals` waitlist provider
4. Audit log in invite-engine + accept
5. `GastberichtenTab` + hook + template lookup in edge functions
6. `reservation-reminders` + pg_cron + `ReconfirmReservation.tsx`
7. Detail panel reconfirm timestamp
8. Deploy alle edge functions

