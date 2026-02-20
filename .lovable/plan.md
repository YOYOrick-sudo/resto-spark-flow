

# Inline Maandkalender — Naadloze Toggle

## Het probleem

De kalender opent nu als een losse popover die visueel niet past bij de widget. De gebruiker wil dat de maandkalender **inline** verschijnt, in dezelfde container en stijl als de horizontale datumstrip, zodat het een naadloze overgang is.

## De oplossing

Een toggle-knop (kalender-icoon) naast de "Datum" label. Bij klik:
- De horizontale datumstrip verdwijnt (smooth)
- Een custom inline maandkalender verschijnt op dezelfde plek, in exact dezelfde visuele stijl (rounded pills, zelfde kleuren, zelfde busyness-dots)
- Bij klik op een dag of op het terug-icoon: maandkalender verdwijnt, datumstrip komt terug

Geen popover, geen externe Calendar component -- een volledig custom inline maandkalender die visueel identiek is aan de week-strip.

## Visueel

### Week-modus (standaard)

```text
  Datum                    [kalender-icoon]
  [Do 20] [Vr 21] [Za 22] [Zo 23] ...  -->
```

### Maand-modus (na klik op kalender-icoon)

```text
  < februari 2026 >        [lijst-icoon]
  Ma  Di  Wo  Do  Vr  Za  Zo
                          1
  2   3   4   5   6   7   8
  9  10  11  12  13  14  15
  ...
```

- Geselecteerde dag: donkere pill (bg-gray-800 text-white), zelfde als in de strip
- Busyness-dots: zelfde kleuren (groen/oranje/rood) onder de dagnummers
- Maand-navigatie: chevron links/rechts, zelfde stijl als de widget
- Achtergrond: geen extra border of shadow, gewoon in de bestaande container

## Gedrag

- Klik op kalender-icoon: week-strip fades out, maandkalender fades in
- Klik op lijst-icoon (in maand-modus): maandkalender fades out, week-strip fades in (scrolled naar geselecteerde dag)
- Klik op een dag in de maandkalender: selecteert de dag, schakelt terug naar week-modus, scrollt strip naar geselecteerde dag
- Dagen buiten het bereik (voor vandaag, na 90 dagen) zijn disabled/grayed out
- Maand-navigatie: pijltjes om door maanden te bladeren

## Technisch

### Bestand: `src/components/widget-mockups/MockWidgetA.tsx`

1. Vervang `calendarOpen` state door `calendarMode` boolean (false = strip, true = maandkalender)
2. Verwijder de Popover/Calendar imports (niet meer nodig)
3. Bouw een inline `MonthCalendar` sectie die:
   - Een 7-kolom grid rendert met Ma-Zo headers
   - Maandnavigatie heeft (chevron left/right + maandnaam)
   - Dezelfde pill-styling gebruikt als de datumstrip (rounded-2xl, bg-gray-800 voor selected)
   - Busyness-dots toont via `DAY_AVAILABILITY` (zelfde mapping als de strip)
   - Bij dagklik: `handleDateSelect(dayIndex)` aanroept + `setCalendarMode(false)`
4. Toggle-knop wisselt tussen `CalendarIcon` (toon maand) en een lijst-icoon (toon strip)
5. Wrap beide views in een container met `transition-opacity` voor een soepele fade
6. Geen nieuwe bestanden of dependencies nodig
