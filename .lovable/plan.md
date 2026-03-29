

# Fase 4.11 Ronde 2 — Waitlist UI

Backend is compleet (POST /waitlist endpoint, waitlist-accept, waitlist-invite-engine, DB trigger). Nu bouwen we de volledige UI-laag.

---

## 1. Widget: Wachtlijst CTA + Formulier

**Bestand:** `src/components/booking/SelectionStep.tsx`

Wanneer `flatSlots.length === 0` en niet loading, vervang de huidige tekst "Geen tijden beschikbaar" door:
- Bolder tekst: "Helaas, deze dag is volgeboekt"
- CTA knop: "Zet me op de wachtlijst →"
- Klik toont inline `WaitlistForm` component

**Nieuw bestand:** `src/components/booking/WaitlistForm.tsx`
- Pre-filled: party_size, datum uit BookingContext
- Velden: tijdvoorkeur (dropdown: "Maakt niet uit" / "Liefst tussen [van] en [tot]"), naam, email, telefoon, opmerkingen
- Honeypot veld (hidden)
- Submit POST naar `public-booking-api/waitlist`
- Succes: toon bevestiging "Je staat op de wachtlijst! We mailen je zodra er plek is." met checkmark

---

## 2. Accept Pagina — `/waitlist/accept/:token`

**Nieuw bestand:** `src/pages/WaitlistAccept.tsx`
- Public route (geen auth nodig)
- On mount: GET `waitlist-accept?token=:token` → laad invite data
- **Geldig invite:** toon restaurantnaam, logo, datum, tijd, gasten, ticket, countdown timer tot `expires_at`
  - "Reserveer nu" knop → POST `waitlist-accept` met `{ token }`
  - Succes: checkmark animatie, manage-link, zelfde stijl als `ConfirmationStep`
- **Verlopen:** "Deze uitnodiging is verlopen. Je staat weer op de wachtlijst."
- **Slot bezet (409):** "Helaas, deze plek is net vergeven. Je staat weer op de wachtlijst."

**Route:** `src/App.tsx` — toevoegen `<Route path="/waitlist/accept/:token" element={<WaitlistAccept />} />`

---

## 3. Operator UI — Wachtlijst tab

### ViewToggle uitbreiden
**Bestand:** `src/components/reserveringen/ViewToggle.tsx`
- `ViewType` wordt `"list" | "grid" | "waitlist" | "calendar"`
- Nieuw icoon: `Clock` of `ListOrdered` voor wachtlijst

### WaitlistView component
**Nieuw bestand:** `src/components/reserveringen/WaitlistView.tsx`
- Query: `waitlist_entries` voor geselecteerde datum + locatie
- Tabel (NestoTable-stijl grid): naam, party size, tijdvoorkeur, status badge, aangemaakt op
- Status badges: Wachtend (geel), Uitgenodigd + countdown (blauw), Geboekt (groen), Verlopen (grijs)
- Filters: status dropdown
- Acties per rij: handmatig uitnodigen (kies slot modal), annuleren
- Empty state als geen entries

### Hook
**Nieuw bestand:** `src/hooks/useWaitlistEntries.ts`
- Query `waitlist_entries` gefilterd op location_id + datum
- Join met `waitlist_invites` voor status/countdown info
- React Query met refetch interval

### Reserveringen pagina
**Bestand:** `src/pages/Reserveringen.tsx`
- Import WaitlistView
- In de view switch: `activeView === "waitlist"` → render WaitlistView

---

## 4. Settings — Wachtlijst

### Route config
**Bestand:** `src/lib/settingsRouteConfig.ts`
- Nieuwe sectie in `reserveringenConfig.sections`: `{ id: "wachtlijst", label: "Wachtlijst", path: "/instellingen/reserveringen/wachtlijst", icon: ListOrdered }`

### Settings pagina
**Nieuw bestand:** `src/pages/settings/reserveringen/SettingsReserveringenWachtlijst.tsx`
- Upsert naar `waitlist_settings` voor location_id
- Toggle: Wachtlijst inschakelen (`waitlist_enabled`)
- Toggle: Automatisch uitnodigen (`auto_invite_enabled`)
- Vertraging na annulering: number input (`auto_invite_delay_minutes`, default 5)
- Geldigheid uitnodiging: number input (`invite_window_minutes`, default 30)
- Gelijktijdige uitnodigingen: number input (`max_parallel_invites`, default 1)
- Prioriteit: select Automatisch/Handmatig (`priority_mode`)
- Volgt bestaand settings card pattern (NestoCard, FormSection dividers)

### Hook
**Nieuw bestand:** `src/hooks/useWaitlistSettings.ts`
- Query + mutation voor `waitlist_settings` per location_id

### Route + export
- `src/App.tsx`: route `/instellingen/reserveringen/wachtlijst`
- `src/pages/settings/reserveringen/index.ts`: export toevoegen

---

## Bestanden overzicht

| Bestand | Actie |
|---|---|
| `src/components/booking/SelectionStep.tsx` | Wachtlijst CTA bij geen slots |
| `src/components/booking/WaitlistForm.tsx` | **Nieuw** — inline formulier |
| `src/pages/WaitlistAccept.tsx` | **Nieuw** — public accept pagina |
| `src/components/reserveringen/ViewToggle.tsx` | Type uitbreiden met "waitlist" |
| `src/components/reserveringen/WaitlistView.tsx` | **Nieuw** — operator wachtlijst tab |
| `src/hooks/useWaitlistEntries.ts` | **Nieuw** — query hook |
| `src/hooks/useWaitlistSettings.ts` | **Nieuw** — settings hook |
| `src/pages/settings/reserveringen/SettingsReserveringenWachtlijst.tsx` | **Nieuw** — settings pagina |
| `src/lib/settingsRouteConfig.ts` | Sectie toevoegen |
| `src/pages/settings/reserveringen/index.ts` | Export toevoegen |
| `src/pages/Reserveringen.tsx` | WaitlistView renderen |
| `src/App.tsx` | 2 routes toevoegen |

