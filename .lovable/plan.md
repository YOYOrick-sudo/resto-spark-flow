

# Smart Landing Page: Alles-in-een Eerste Stap

## Het Idee

De huidige lineaire flow (ticket -> datum -> tijd -> gegevens -> bevestiging) wordt omgebouwd naar een slimmere flow:

**Stap 1 (nieuw): Datum, Gasten, Tijd + Tickets op een pagina**
De gast landt op een pagina waar datum, aantal gasten en tijdslot bovenaan staan als compacte selectors. Daaronder verschijnen de beschikbare tickets. Alles werkt in twee richtingen:

- Gast kiest eerst datum + tijd + gasten --> tickets worden gefilterd (niet-beschikbare tickets worden vervaagd maar blijven zichtbaar)
- Gast kiest eerst een ticket --> datum springt naar eerstvolgende beschikbare dag, tijd naar eerstvolgende slot

**Stap 2: Gegevens invullen** (was stap 4)
**Stap 3: Bevestiging** (was stap 5)

Van 5 stappen naar 3 stappen. Sneller, slimmer.

---

## Visueel Ontwerp Stap 1

```text
+----------------------------------+
|            [LOGO]                |
|          * ** * (dots)           |
|                                  |
|  [DATUM]  horizontale scroll     |
|  Do 20 | Vr 21 | Za 22 | ...    |
|                                  |
|  [GASTEN]  -  2  +               |
|                                  |
|  [TIJD]  grid 3-kolom            |
|  17:00 | 17:30 | 18:00          |
|  18:30 | 19:00 | 19:30          |
|                                  |
|  --- Beschikbare ervaringen ---  |
|                                  |
|  [Diner kaart]          actief   |
|  [Chef's Table kaart]   actief   |
|  [Sunday Brunch]        vervaagd |
|                                  |
+----------------------------------+
|  [<]  [ Volgende (1/2) ]         |
+----------------------------------+
```

---

## Mock Data: Ticket Beschikbaarheid

Nieuwe data structuur in `mockData.ts` die bepaalt welke tickets beschikbaar zijn per tijdslot:

- **Diner**: beschikbaar 17:00-21:00 (alle avondslots)
- **Chef's Table**: beschikbaar 18:30-20:30 (beperkte avondslots)
- **Sunday Brunch**: alleen beschikbaar op zondag (dag-index 3 en 10 in de 14-daagse reeks), tijden 10:00-14:00 (niet in de huidige avondslots, dus altijd vervaagd tenzij we brunch-slots toevoegen)

Voor de mockup houden we het simpel: een map van `ticketId` naar een object met `availableDays` (dag-indices) en `availableTimeSlots` (tijden). Brunch krijgt eigen tijdslots die alleen verschijnen als het zondag is.

---

## Interactie-logica

### Bij selectie van datum/tijd/gasten:
1. Check per ticket of het beschikbaar is voor de gekozen combinatie
2. Niet-beschikbare tickets krijgen `opacity-40` en een "Niet beschikbaar" label
3. Ze blijven klikbaar -- bij klik verschijnt een subtiel bericht ("Niet beschikbaar op deze datum")
4. Party size wordt gecheckt tegen ticket min/max

### Bij selectie van een ticket:
1. Als er nog geen datum is gekozen: selecteer automatisch de eerstvolgende dag waarop dit ticket beschikbaar is
2. Als er nog geen tijd is gekozen: selecteer automatisch het eerste beschikbare tijdslot voor dit ticket
3. Tijdslots in de grid worden dynamisch: slots waar dit ticket niet beschikbaar is worden vervaagd

### Ambient background:
- Blijft werken zoals nu: bij ticket-selectie verandert de sfeer
- Nu direct zichtbaar op de eerste pagina (geen wachten tot stap 2)

---

## Technische Wijzigingen

### `mockData.ts`
- Nieuw: `TICKET_AVAILABILITY` map met per ticket de beschikbare dagen en tijdslots
- Nieuw: `BRUNCH_TIME_SLOTS` array met ochtend/middag tijden (10:00-14:00)
- Helper functie `getAvailableTimeSlotsForDate()` die de juiste tijdslots retourneert op basis van welke tickets op die dag actief zijn

### `MockWidgetA.tsx`
- Stap 1 wordt de gecombineerde pagina: datum-scroll + gasten-teller + tijd-grid + tickets
- Stap 2 wordt gegevens (was stap 4)
- Stap 3 wordt bevestiging (was stap 5)
- `totalSteps` van 5 naar 3
- `canNext()` stap 1: vereist selectedTicket EN selectedDate EN selectedTime
- Nieuwe state: geen extra state nodig, alles bestaat al
- Tickets rendering: conditioneel `opacity-40` class + "Niet beschikbaar" overlay tekst
- Bij ticket-klik: auto-set datum en tijd als die nog niet gekozen zijn
- Progress dots: van 4 naar 2 dots

### Secties volgorde in stap 1:
1. Datum (horizontale scroll, compact)
2. Gasten (stepper, compact)  
3. Tijd (grid, compact)
4. Divider: "Kies je ervaring"
5. Ticket kaarten (met beschikbaarheids-status)

