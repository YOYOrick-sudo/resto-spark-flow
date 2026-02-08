

## Dag-labels uitlijnen met hover dots

### Probleem

De dag-labels (M D W D V Z Z) zijn een **HTML overlay** met `flex` en `px-3` padding, terwijl de hover dots door **Recharts SVG** worden gepositioneerd. Deze twee systemen gebruiken compleet andere coördinaten, waardoor ze nooit perfect uitlijnen.

### Oplossing

Vervang de HTML overlay door een **Recharts XAxis** component. Hierdoor worden de labels door dezelfde engine gepositioneerd als de datapunten — perfecte uitlijning gegarandeerd.

### Wijzigingen in `src/components/dashboard/ReservationsTile.tsx`

#### 1. XAxis importeren

Voeg `XAxis` toe aan de Recharts import.

#### 2. XAxis toevoegen aan de AreaChart

```
<XAxis
  dataKey="day"
  axisLine={false}
  tickLine={false}
  tick={{ fontSize: 11, fill: '#ACAEB3' }}
  dy={4}
/>
```

- Gebruikt `dataKey="day"` zodat de labels direct uit de data komen (al aanwezig in `mockData`)
- Geen aslijn of tick-streepjes
- Zelfde styling als de huidige labels

#### 3. Laatste label teal maken

Een custom tick-renderer die het laatste label teal (#1d979e, fontWeight 600) maakt en de rest grijs houdt — exact zoals nu.

#### 4. HTML overlay verwijderen

De `<div className="absolute bottom-0 ...">` met de `dayLabels.map()` wordt volledig verwijderd. Ook de `dayLabels` array bovenaan kan weg (de data komt nu uit `mockData.day`).

#### 5. AreaChart margin bottom aanpassen

Voeg `bottom: 20` toe aan de margin zodat er ruimte is voor de XAxis labels: `margin={{ top: 8, right: 0, bottom: 20, left: 0 }}`.

### Bestanden

| Bestand | Actie |
|---|---|
| `src/components/dashboard/ReservationsTile.tsx` | HTML overlay vervangen door Recharts XAxis, dayLabels array verwijderen |

### Resultaat

- Dag-labels staan exact onder hun bijbehorende datapunt
- Hover dots verschijnen precies boven de juiste dag-label
- Visuele stijl blijft identiek (grijs, laatste label teal)

