
# Ticket afkorting toevoegen aan Reserveringen Lijst

## Wat verandert er
De "Shift" kolom in de lijstweergave wordt uitgebreid: naast de shift-naam komt er een compacte 2-letter badge met de ticket-afkorting (bijv. "LD" voor "Late Dinner"). De afkorting wordt automatisch gegenereerd uit de eerste letters van elk woord.

## Visueel resultaat
```
Shift kolom:  [Diner] LD
```
De shift-naam blijft als outline badge, en daarnaast verschijnt een kleine compacte badge met de ticket-afkorting. Een tooltip toont de volledige ticket-naam bij hover.

## Technische wijzigingen

### 1. Helper functie: afkorting genereren
In `src/lib/reservationUtils.ts` wordt een `getTicketAbbreviation` functie toegevoegd:
- "Late Dinner" wordt "LD"
- "Standaard" wordt "ST" (eerste 2 letters bij enkele woorden)
- Max 3 karakters

### 2. `src/components/reserveringen/ReservationListView.tsx`
- **Grid aanpassing**: De shift-kolom iets breder maken (128px naar 160px) om ruimte te bieden voor shift + ticket badge
- **Kolomkop**: "Shift" hernoemen naar "Shift / Ticket"
- **Rij-render**: Naast de shift-badge een kleine ticket-afkorting badge tonen met tooltip voor de volledige naam
- De `ticket_name` is al beschikbaar op het `Reservation` type (joined field)

### 3. Grid view (`ReservationBlock.tsx`)
- Geen wijziging nodig; de ticket-info wordt alleen in de lijstweergave getoond (grid-blokken hebben te weinig ruimte)
