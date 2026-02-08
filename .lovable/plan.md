

## Polish: Reserveringen Chart visueel verfijnen

Je hebt gelijk -- de labels staan nu technisch goed maar optisch nog iets te strak op de rand. Drie kleine verbeteringen:

### Wijzigingen in `src/components/dashboard/ReservationsTile.tsx`

#### 1. XAxis padding toevoegen

`padding={{ left: 8, right: 8 }}` op de XAxis zorgt dat "M" en "Z" ~8px van de chartrand af staan. Subtiel, maar merkbaar mooier.

#### 2. Chart margins finetunen

Margins van 16 naar 12 -- in combinatie met de XAxis padding is 12px genoeg en wordt de chart niet onnodig smal.

#### 3. Tooltip dark mode fix

De tooltip gebruikt nu `bg-gray-900 text-white` (hardcoded). Wijzigen naar `bg-foreground text-background` zodat het in beide thema's klopt.

### Overzicht

| Wat | Van | Naar |
|---|---|---|
| XAxis | geen padding | `padding={{ left: 8, right: 8 }}` |
| AreaChart margin left/right | 16 | 12 |
| Tooltip klassen | `bg-gray-900 text-white` | `bg-foreground text-background` |

### Resultaat

- M en Z labels staan optisch los van de kaartrand
- Chart lijn loopt nog steeds breed uit
- Tooltip werkt in light en dark mode
