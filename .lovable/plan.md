
# Fase 4.10 — Stap 4: Widget Stap 3+4 + ManageReservation + Fixes

## Overzicht

Zes onderdelen in deze stap:

1. **Fix: "kort verblijf" naar "kortere zittijd"** in TimeTicketStep
2. **Fix: Dynamische party size** uit ticket config (niet hardcoded 1-20)
3. **Stap 3: GuestDetailsStep** -- gastgegevens formulier + guest lookup + booking questions
4. **Stap 4: ConfirmationStep** -- bevestigingspagina met agenda-link en beheerlink
5. **ManageReservation pagina** -- route `/manage/:token` (path param, geen query string)
6. **Edge Function uitbreiden** -- min/max party in /config + modify-actie in /manage

---

## 1. Fix: Squeeze label

**Bestand:** `src/components/booking/TimeTicketStep.tsx` regel 112

Wijzig `kort verblijf` naar `kortere zittijd`.

---

## 2. Fix: Dynamische party size

### Edge Function (`public-booking-api/index.ts`)
In `handleConfig`: na widget_settings ophalen, ook actieve tickets voor de locatie ophalen en `min_party_size` (laagste) en `max_party_size` (hoogste) berekenen. Toevoegen aan config response.

### BookingContext (`src/contexts/BookingContext.tsx`)
- `WidgetConfig` type uitbreiden met `min_party_size` en `max_party_size`
- Default `party_size` aanpassen na config load

### DateGuestsStep (`src/components/booking/DateGuestsStep.tsx`)
- Hardcoded `1` en `20` vervangen door `config.min_party_size` en `config.max_party_size`

---

## 3. Stap 3: GuestDetailsStep (nieuw bestand)

**Bestand:** `src/components/booking/GuestDetailsStep.tsx`

### Velden
- Voornaam (verplicht), achternaam (verplicht), email (verplicht), telefoon (optioneel), opmerkingen (optioneel)
- Honeypot: verborgen input `name="website"`, `tabindex="-1"`

### Guest lookup
- Bij email blur: POST naar `/guest-lookup`
- Als `found: true`: vul naam + telefoon in, toon "Welkom terug, {voornaam}!"

### Booking questions
- Dynamisch renderen vanuit `config.booking_questions`
- `text` -> text input
- `single_select` -> radio group
- `multi_select` -> checkboxes
- Antwoorden opslaan als `{ question_id, values }[]`

### BookingContext uitbreidingen
- Nieuw state: `guestData` (naam, email, telefoon, notes, answers, honeypot)
- `canGoNext` voor stap 3: voornaam + achternaam + email ingevuld
- `submitBooking()` functie: POST naar `/book`, retourneert `{ success, reservation_id, manage_token }`
- State: `bookingResult`, `bookingLoading`, `bookingError`

---

## 4. Stap 4: ConfirmationStep (nieuw bestand)

**Bestand:** `src/components/booking/ConfirmationStep.tsx`

- Groene checkmark
- Overzicht: datum, tijd, gasten, ticket naam
- "Voeg toe aan agenda" link (Google Calendar URL)
- Beheerlink: `/manage/{manage_token}`
- "Powered by Nesto" (als `show_nesto_branding` true)
- Optioneel: "Terug naar website" knop als `success_redirect_url` is ingesteld
- Geen terug-knop

---

## 5. ManageReservation pagina (nieuw bestand)

**Bestand:** `src/pages/ManageReservation.tsx`

### Route
`/manage/:token` -- publieke route, token als path parameter (geen query string)

### Gedrag
- Haal reserveringsdetails op via `GET /manage?token=xxx` (bestaand endpoint)
- Toont: datum, tijd, gasten, ticket naam, status, gast opmerkingen

### Annuleren
- Als `can_cancel === true`: "Annuleer reservering" knop
- ConfirmDialog met optioneel reden-veld
- POST naar `/manage` met `{ token, action: 'cancel', cancellation_reason }`

### Wijzigen (tijd + party size)
- Als deadline niet verstreken: toon "Wijzig reservering" knop
- Opent inline wijzig-modus:
  - Party size aanpassen (stepper)
  - Nieuwe tijdslot kiezen (hergebruik van availability endpoint)
- POST naar `/manage` met `{ token, action: 'modify', new_date, new_start_time, new_party_size }`
- Backend herberekent beschikbaarheid, maakt nieuwe reservering aan en annuleert oude (of update in-place)

### Edge Function uitbreiding voor modify
In `handleManagePost`: naast `cancel` ook `modify` actie ondersteunen:
- Valideer dat status `confirmed` of `option` is
- Check cancel policy deadline (modify valt onder zelfde deadline)
- Verifieer beschikbaarheid van nieuwe slot via availability engine
- Update reservering: `reservation_date`, `start_time`, `end_time`, `party_size`, `duration_minutes`
- Herbereken tafel via `assign_best_table` RPC
- Audit log met action `modified` en changes object

---

## 6. Route in App.tsx

Nieuwe publieke route toevoegen:

```text
<Route path="/manage/:token" element={<ManageReservation />} />
```

Buiten de ProtectedRoute wrapper, naast `/book/:slug`.

---

## Technische samenvatting

### Bestanden die wijzigen

| Bestand | Wijziging |
|---------|-----------|
| `src/components/booking/TimeTicketStep.tsx` | "kort verblijf" -> "kortere zittijd" |
| `src/contexts/BookingContext.tsx` | guestData, submitBooking, min/max party, canGoNext stap 3 |
| `src/components/booking/DateGuestsStep.tsx` | Dynamische min/max uit config |
| `supabase/functions/public-booking-api/index.ts` | min/max in /config + modify actie in /manage |
| `src/pages/BookingWidget.tsx` | Import + render GuestDetailsStep en ConfirmationStep |
| `src/App.tsx` | Route /manage/:token |

### Nieuwe bestanden

| Bestand | Doel |
|---------|------|
| `src/components/booking/GuestDetailsStep.tsx` | Stap 3: gastgegevens + booking questions |
| `src/components/booking/ConfirmationStep.tsx` | Stap 4: bevestiging + agenda link |
| `src/pages/ManageReservation.tsx` | Beheerlink: bekijken + annuleren + wijzigen |

### Geen database wijzigingen nodig
Alles is al voorbereid in stap 1 (widget_settings, reservations.tags).
