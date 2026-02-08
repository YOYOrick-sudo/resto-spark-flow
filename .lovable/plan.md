

## Reserveringen Tile — Chart & Dag-labels Fix

### Huidige situatie

De ReservationsTile heeft nu een chart die niet tot de rand loopt en dag-labels die via een custom `renderDayTick` functie worden gerenderd. De card gebruikt `!p-0` met handmatige padding per sectie.

### Wijzigingen in `src/components/dashboard/ReservationsTile.tsx`

**1. Mock data aanpassen**

Vervang de huidige data array door 14 objecten met een `day` veld. De eerste 7 items krijgen `day: ''`, de laatste 7 krijgen `'M', 'D', 'W', 'D', 'V', 'Z', 'Z'`. Verwijder de huidige `dayLabels` array en de `.map()` die `dayLabel`/`isToday` toevoegt.

```text
{ date: '26 jan', day: '', count: 8 },
{ date: '27 jan', day: '', count: 12 },
...
{ date: '7 feb', day: 'Z', count: 32 },
{ date: '8 feb', day: 'Z', count: 20 },
```

**2. XAxis met custom tick**

Vervang de huidige `renderDayTick` functie door een nieuw `renderDayTick` die:
- Alleen tekst toont als `payload.value` niet leeg is
- Het laatste datapunt (index 13) krijgt `fontWeight: 600` en `fill: "#1d979e"`
- Alle andere labels krijgen `fill: "#ACAEB3"`
- `fontSize: 11`, `dy: 8`

XAxis config:
- `dataKey="day"`
- `axisLine={false}`, `tickLine={false}`
- `tick={renderDayTick}`
- `interval={0}`
- `height={28}` (ruimte voor labels + dy)

**3. CustomDot aanpassen**

De dot op het laatste punt krijgt:
- `fill="#1d979e"`
- `r={4}`
- `stroke="#fff"`
- `strokeWidth={2}`

**4. Tooltip styling**

Update de `renderTooltip` functie:
- Container classes: `bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg`
- Toont datum en "X reserveringen"
- Geen border

**5. Chart wrapper edge-to-edge**

De card gebruikt al `!p-0` en de chart `margin={{ top: 0, right: 0, bottom: 0, left: 0 }}`. De `ResponsiveContainer` height wordt `160` om ruimte te bieden voor de XAxis labels (140 chart + 28 labels, maar ResponsiveContainer rekent inclusief XAxis mee).

### Samenvatting van bestanden

| Bestand | Actie |
|---|---|
| `src/components/dashboard/ReservationsTile.tsx` | Bewerken |
