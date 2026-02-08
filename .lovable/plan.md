

## Reserveringen Chart — Volledige Breedte & Geintegreerde Labels

### Probleem

1. **Rechts witte ruimte**: Recharts voegt standaard 5px interne padding toe aan de SVG, waardoor de gradient/lijn niet tot de rechterrand reikt.
2. **Dag-labels zweven los**: De HTML dag-labels staan in een aparte div onder de chart met padding/margin ertussen. Ze moeten direct tegen de gradient aanzitten, zoals bij Polar.sh.

### Oplossing

#### 1. XAxis terug in de chart (als overlay op de gradient)

Breng de `XAxis` terug in de `AreaChart` zodat de labels **binnen** het chart-gebied zitten. De gradient loopt dan over de labels heen. Configuratie:

- `dataKey="day"`, `interval={0}`
- `axisLine={false}`, `tickLine={false}`  
- `tick` als custom render functie
- `height={24}` — dit reserveert ruimte onderaan de chart voor de labels, maar de gradient fill bedekt dit gebied ook

#### 2. Custom tick renderer

De tick functie:
- Toont niks als `payload.value` leeg is (eerste 7 datapunten)
- Laatste datapunt (index 13): `textAnchor="end"`, `fontWeight: 600`, `fill: "#1d979e"`
- Eerste zichtbare label (index 7): `textAnchor="start"`
- Rest: `textAnchor="middle"`
- `fontSize: 11`, `dy: 4`

#### 3. Gradient doorlopen tot onderkant inclusief XAxis

Door de XAxis **binnen** de AreaChart te plaatsen (in plaats van als aparte HTML), loopt de gradient fill automatisch door tot de onderkant van de hele chart area inclusief de XAxis ruimte. De gradient bedekt de labels subtiel.

#### 4. Rechterrand fix

Recharts heeft een interne padding op het SVG element. Dit lossen we op met een negatieve margin op de chart wrapper: `-mr-[5px]` en `overflow-hidden` op de parent (al aanwezig op NestoCard). Alternatief: gebruik `width="calc(100% + 5px)"` op de ResponsiveContainer wrapper.

Een betere aanpak: wrap de ResponsiveContainer in een div met `style={{ marginRight: -5 }}` zodat de rechterrand van de SVG voorbij de card-rand valt en door `overflow-hidden` wordt afgesneden. Dit geeft een perfect edge-to-edge resultaat.

#### 5. HTML dag-labels verwijderen

Verwijder de `dayLabels` array en de complete HTML div met de labels (regels 84-97). De labels komen nu uit de XAxis.

### Wijzigingen

| Bestand | Actie |
|---|---|
| `src/components/dashboard/ReservationsTile.tsx` | XAxis terug toevoegen in AreaChart met custom tick, HTML labels div verwijderen, wrapper met negatieve margin rechts voor edge-to-edge |

### Technische details

De chart wrapper div krijgt:
```text
<div className="mt-4" style={{ marginRight: -5 }}>
```

De AreaChart bevat weer een XAxis:
```text
<XAxis
  dataKey="day"
  axisLine={false}
  tickLine={false}
  tick={renderDayTick}
  interval={0}
  height={24}
/>
```

De `renderDayTick` functie:
```text
function renderDayTick({ x, y, payload, index }: any) {
  if (!payload.value) return null;
  const isToday = index === mockData.length - 1;
  const isFirst = index === 7;
  const anchor = isToday ? 'end' : isFirst ? 'start' : 'middle';
  return (
    <text x={x} y={y} dy={4} textAnchor={anchor}
      fontSize={11} fontWeight={isToday ? 600 : 400}
      fill={isToday ? '#1d979e' : '#ACAEB3'}>
      {payload.value}
    </text>
  );
}
```

De gradient fill loopt nu door over de dag-labels heen, en de chart reikt tot beide randen van de card.
