

# Compact Selector Dropdown op Stap 1

## Het probleem

De huidige stap 1 toont datum-scroll, gasten-stepper, tijd-grid EN ticket-kaarten op een pagina. De datum/tijd/gasten nemen zoveel ruimte in dat je moet scrollen voordat je de ervaringen (tickets) ziet. De ervaringen moeten de hoofdrol spelen.

## De oplossing

Datum, gasten en tijd worden samengevouwen in een compacte dropdown-balk bovenaan stap 1. Standaard ingeklapt als een enkele rij met een samenvatting. Bij klik klapt de volledige selector open. De ticket-kaarten zijn direct zichtbaar onder de balk.

## Visueel

### Ingeklapt (standaard)

```text
+----------------------------------+
|            [LOGO]                |
|           * ** *                 |
|                                  |
|  v  Vr 21 feb · 2 gasten · 19:00|
|                                  |
|  --- Kies je ervaring ---        |
|                                  |
|  [Diner kaart - grote visual]    |
|  [Chef's Table - grote visual]   |
|  [Sunday Brunch - vervaagd]      |
|                                  |
+----------------------------------+
|  [ Volgende (1/2) ]              |
+----------------------------------+
```

### Uitgeklapt (na klik op balk)

```text
+----------------------------------+
|            [LOGO]                |
|           * ** *                 |
|                                  |
|  ^  Je selectie                  |
|  --------------------------------|
|  [DATUM scroll]                  |
|  Do 20 | Vr 21 | Za 22 | ...    |
|                                  |
|  [GASTEN]   -  2  +             |
|                                  |
|  [TIJD grid]                     |
|  17:00 | 17:30 | 18:00          |
|  18:30 | 19:00 | 19:30          |
|  --------------------------------|
|                                  |
|  --- Kies je ervaring ---        |
|                                  |
|  [Diner kaart]                   |
|  ...                             |
+----------------------------------+
```

## Gedrag

- **Default**: dropdown is ingeklapt, toont "Vr 21 feb . 2 gasten . 19:00" met chevron-down
- **Klik**: klapt open en toont de volledige datum-scroll, gasten-stepper en tijd-grid
- **Na selectie**: blijft open zodat de gast meerdere dingen kan aanpassen
- **Auto-defaults**: bij laden wordt automatisch de eerste beschikbare dag en tijd geselecteerd zodat de samenvatting-balk altijd gevuld is
- **Ticket-selectie**: blijft werken zoals nu (auto-update datum/tijd als nodig), dropdown klapt automatisch dicht bij ticket-klik
- De bi-directionele filtering blijft volledig intact

## Technische wijzigingen

### Bestand: `src/components/widget-mockups/MockWidgetA.tsx`

1. Hernoem de bestaande `summaryOpen` state naar `selectorOpen` (of hergebruik)
2. Wrap de datum/gasten/tijd secties in een collapsible container, gestuurd door `selectorOpen`
3. Voeg een compacte samenvatting-balk toe bovenaan die de huidige selectie toont
4. Bij ticket-selectie: `setSelectorOpen(false)` zodat de dropdown dichtklapt
5. Auto-select eerste beschikbare datum en tijd bij mount (zodat de balk nooit leeg is)
6. De divider "Kies je ervaring" en ticket-kaarten blijven BUITEN de dropdown -- altijd zichtbaar
7. Styling: `bg-white rounded-2xl` met subtiele shadow, consistent met bestaande componenten

### Geen nieuwe bestanden of dependencies nodig

