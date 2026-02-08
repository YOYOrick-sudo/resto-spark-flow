

## Fix: Alle 7 dag-labels tonen

### Probleem

De XAxis mist de `allowDuplicatedCategory` prop. Recharts dedupliceert standaard identieke tick-waarden. In de data komen "D" en "Z" elk twee keer voor (dinsdag/donderdag en zaterdag/zondag), maar Recharts toont ze maar een keer. Resultaat: 5 labels in plaats van 7.

### Wijziging in `src/components/dashboard/ReservationsTile.tsx`

Voeg `allowDuplicatedCategory={true}` toe aan de XAxis op regel 60:

```tsx
<XAxis
  dataKey="day"
  allowDuplicatedCategory={true}   // <-- toevoegen
  axisLine={false}
  tickLine={false}
  tick={...}
/>
```

Dat is alles -- een enkele prop toevoegen.

### Resultaat

- Alle 7 dag-labels zichtbaar: M D W D V Z Z
- Hover dots blijven perfect aligned met elke dag
- Laatste label (Z, zondag) blijft teal en bold
