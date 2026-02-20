

# Implementatie MockWidgetA als definitieve boekingswidget

## Overzicht

MockWidgetA wordt de productie-widget. De huidige 4-5 stappen flow wordt vervangen door een 3-stappen flow met een compleet nieuw visueel ontwerp.

## Wat verandert er

### Flow: 4-5 stappen wordt 3

| Stap | Huidige widget | Nieuwe widget (MockWidgetA) |
|------|---------------|---------------------------|
| 1 | Ticket OF Datum+Gasten | Alles: datum, gasten, tijd + tickets (gecombineerd) |
| 2 | Tijd | Gegevens (naam, email, telefoon, opmerkingen) |
| 3 | Gegevens | Bevestiging (ticket-kaart met QR) |
| 4 | Bevestiging | -- |
| 5 | Bevestiging (showcase) | -- |

### Visueel

| Element | Huidig | Nieuw |
|---------|--------|-------|
| Achtergrond | #FAFAF8 | #FAFAFA |
| Progress | Gekleurde dots (primary color) | Grijze bars (h-1.5, bg-gray-800) |
| Datum selectie | react-day-picker maandkalender | Horizontale strip (90 dagen) + inline maandtoggle |
| CTA knop | Primary color, per stap | Donker (#1a1a1a), met stap-indicator |
| Ticket cards | Simpele kaarten zonder image | rounded-3xl met image, gradient overlay, prijs-badge |
| Ambient background | Geen | Blurred ticket-foto (blur 40px, opacity 0.08) |
| Footer font | Plus Jakarta Sans | Inter |

---

## Bestanden

### Nieuw aanmaken

**`src/components/booking/SelectionStep.tsx`** -- De gecombineerde stap 1
- Collapsible selector dropdown (datum/gasten/tijd compact ingeklapt)
- Horizontale datumstrip (90 dagen) + inline maandkalender toggle (Week/Maand)
- Gasten-teller (rounded pill, +/- knoppen)
- Tijdgrid (4 kolommen, availability dots amber/rood behouden)
- "Kies je ervaring" divider
- Ticket-kaarten (rounded-3xl, image met gradient overlay, prijs-badge, check-icoon)
- Bi-directionele filtering: ticket selectie auto-selecteert datum/tijd, datum/tijd filtert tickets
- Gebruikt echte API data via `useBooking()` (availableShifts, loadAvailability, tickets van config)
- Mapping van `availableShifts[].slots[]` naar plat tijdgrid
- Selector standaard OPEN als er nog geen volledige selectie is
- Ticket images fallback naar gradient als `image_url` null is

### Aanpassen

**`src/contexts/BookingContext.tsx`**
- Verwijder `showcase`/`quick` onderscheid: 1 flow, `totalSteps` altijd 3
- Update `STEP_MAP`: `{ selection: 1, details: 2, confirmation: 3 }`
- Update `canGoNext` logica: stap 1 = ticket + datum + slot geselecteerd
- `effectiveStyle` property kan weg of wordt altijd `'unified'`
- Update `StepName` type

**`src/pages/BookingWidget.tsx`**
- Vervang import van TicketSelectStep/DateGuestsStep/TimeTicketStep door SelectionStep
- Verwijder `renderStep()` switch met showcase/quick: altijd 3 stappen
- Ambient background toevoegen (blurred ticket-foto, blur 40px, opacity 0.08, scale 1.2)
- CTA-balk onderaan: donkere knop (#1a1a1a) met stap-indicator ("Volgende 1/2")
- Back-knop als vierkant icoon (rounded-[10px])
- Summary dropdown op stap 2 (uit MockWidgetA gekopieerd)
- Bottom gradient fade
- Footer: Inter font
- Behoud: embed messaging, close-knop, ResizeObserver, postMessage

**`src/components/booking/BookingProgress.tsx`**
- Van gekleurde dots naar grijze bars (h-1.5)
- Active: w-6 bg-gray-800, completed: w-1.5 bg-gray-800, remaining: w-1.5 bg-gray-300
- Alleen tonen op stap 1 en 2, niet op bevestiging
- Verwijder primary_color afhankelijkheid

**`src/components/booking/GuestDetailsStep.tsx`**
- Styling aanpassen naar MockWidgetA: IconInput met links icoon (User, Mail, Phone)
- Verwijder eigen terug-knop en submit-knop (CTA wordt door BookingWidget shell geregeld)
- Of: behoud submit-knop maar met donkere styling (#1a1a1a)
- Focus states: `focus:ring-1 focus:ring-gray-300` i.p.v. primary color
- Input styling: rounded-xl, border-gray-200
- Behoud: email lookup, honeypot, booking questions, welcomeBack banner

**`src/components/booking/ConfirmationStep.tsx`**
- Vervang door MockWidgetA's "ticket-kaart" design
- Dashed borders boven en onder (border-dashed border-gray-200)
- QR placeholder (4x4 grid blokjes)
- "Opnieuw boeken" link onderaan
- Behoud: Google Calendar link, manage-link, success_redirect_url
- Animated checkmark kan vereenvoudigd worden naar de groene cirkel met Check icoon

### Verwijderen

- `src/components/booking/TicketSelectStep.tsx`
- `src/components/booking/DateGuestsStep.tsx`
- `src/components/booking/TimeTicketStep.tsx`

---

## Aandachtspunten die extra controle nodig hebben

1. **Mock data vs echte API**: MockWidgetA gebruikt `mockData.ts` helpers. De productie-versie moet werken met `availableShifts` van de API. De `loadAvailability()` call moet getriggerd worden bij datum/partySize wijziging. De `loadAvailableDates()` call is nodig voor de maandkalender (disabled dagen).

2. **Ticket data mapping**: MockWidgetA tickets hebben `imageUrl`, `price`, `minGuests`, `maxGuests`. Productie tickets hebben `image_url`, geen directe prijs, `min_party_size`, `max_party_size`. De property namen moeten gemapt worden.

3. **Bi-directionele filtering in productie**: In de mockup is dit gesimuleerd met `isTicketAvailable()`. In productie moeten we checken of een ticket beschikbaar is voor de geselecteerde datum/tijd door te kijken of er slots zijn met dat `ticket_id` in `availableShifts`.

4. **Gasten min/max**: De productie-widget respecteert `config.min_party_size` en `config.max_party_size`. Dit moet behouden blijven in de gasten-teller.

5. **Stap animaties**: De huidige widget heeft `animate-step-forward` / `animate-step-back` CSS classes. De mockup gebruikt een simpelere `opacity` fade. We nemen de fade-aanpak over.

6. **Widget settings backwards compatibility**: De `widget_style` setting ('auto'/'showcase'/'quick') in de database wordt niet meer gebruikt voor flow-routing. De kolom blijft bestaan maar heeft geen effect meer.

7. **Booking questions**: Deze worden gerenderd in GuestDetailsStep en moeten behouden blijven.

8. **Google Reserve URL**: In de huidige ConfirmationStep wordt `config.google_reserve_url` niet gebruikt, maar `calendarUrl` en `manageUrl` wel. Beide moeten behouden blijven.

9. **End time display**: `config.show_end_time` wordt nu in TimeTicketStep getoond. Dit moet verplaatst worden naar de summary of het tijdgrid in SelectionStep.

10. **CSS keyframes**: De `checkPop` animatie uit MockWidgetA en de bestaande `check-circle`/`check-fill`/`check-mark` animaties moeten samengevoegd worden -- we nemen de MockWidgetA versie.

## Wat NIET verandert

- Alle backend API calls (public-booking-api endpoints)
- BookingProvider wrapper en slug-based routing
- Embed messaging (postMessage, ResizeObserver, nesto:booked, nesto:close, nesto:resize)
- Guest lookup on email blur
- Honeypot spam protection
- Widget settings pagina (SettingsReserveringenWidget.tsx)
- ManageReservation pagina
- MockWidgetA.tsx en MockWidgetB.tsx (blijven bestaan als referentie)

## Volgorde van implementatie

1. BookingContext.tsx -- 3-stappen flow
2. SelectionStep.tsx -- Nieuw bestand, hart van de refactor
3. BookingProgress.tsx -- Grijze bars
4. GuestDetailsStep.tsx -- MockWidgetA styling
5. ConfirmationStep.tsx -- Ticket-kaart design
6. BookingWidget.tsx -- Shell update (ambient bg, CTA, footer)
7. Verwijder oude step-componenten

