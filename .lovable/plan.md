

## Reserveringen Chart — Edge-to-Edge & Gradient Fix

### Probleem

De chart loopt niet helemaal tot de linker- en rechterrand van de card. Er is `margin.right: 8` op de AreaChart waardoor rechts witte ruimte ontstaat. Daarnaast stopt de teal gradient boven de XAxis in plaats van door te lopen tot de onderkant van de card.

### Oplossing

#### 1. Chart margins op 0 zetten

De `AreaChart` margin wordt `{ top: 0, right: 0, bottom: 0, left: 0 }` zodat de lijn en gradient echt van rand tot rand lopen.

#### 2. Laatste label afsnijding voorkomen zonder margin

In plaats van `margin.right: 8` gebruiken we `textAnchor="end"` op het laatste label (al geimplementeerd) en passen we de XAxis `padding` prop aan: `padding={{ left: 0, right: 6 }}`. Dit verschuift het laatste datapunt net genoeg naar links zodat het label past, zonder witte ruimte aan de rand (de gradient/fill loopt nog steeds tot de SVG-rand door).

#### 3. Gradient doorlopen tot onderkant

Het probleem is dat de XAxis `height={28}` ruimte reserveert onder het chart-gebied, waardoor de gradient daar stopt. Oplossing:

- Gebruik een **relative container** met de chart en de labels **als aparte laag**
- De `AreaChart` krijgt **geen XAxis** meer — verwijder de XAxis uit de AreaChart
- De dag-labels worden een apart `div` element onder de chart, gepositioneerd met CSS
- De `ResponsiveContainer` height wordt `140` (alleen chart, geen XAxis ruimte)
- Onder de chart komt een `div` met `px-2 pb-3 pt-1` die de 7 dag-labels toont als een flex row met `justify-between`, maar alleen over de rechterhelft (de laatste 7 datapunten)

Concreet:
- Wrapper div wordt `relative`
- Chart `ResponsiveContainer` height `140`, geen XAxis
- Nieuw `div` eronder met de dag-labels als gewone HTML tekst
- De labels div heeft `flex justify-end` met 7 items die elk `flex-1 text-center` zijn
- Laatste label krijgt teal kleur en bold

#### 4. Gradient opacity aanpassen

De gradient `stopOpacity` bij 100% wordt `0.02` in plaats van `0` zodat er een subtiele tint overblijft tot de onderkant.

### Wijzigingen

| Bestand | Actie |
|---|---|
| `src/components/dashboard/ReservationsTile.tsx` | XAxis verwijderen uit AreaChart, dag-labels als HTML div eronder, chart margin op 0, gradient tot bodem |

### Technische details

```text
<div className="mt-4">
  <ResponsiveContainer width="100%" height={140}>
    <AreaChart data={mockData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
      <!-- geen XAxis -->
      <Tooltip ... />
      <Area ... />
    </AreaChart>
  </ResponsiveContainer>
  <div className="flex px-2 pb-3 pt-1">
    <div className="w-1/2" />  <!-- lege ruimte voor eerste 7 datapunten -->
    <div className="flex flex-1">
      {['M','D','W','D','V','Z','Z'].map((label, i) => (
        <span key={i} className="flex-1 text-center text-[11px] ..."
              style={i===6 ? {color:'#1d979e', fontWeight:600} : {color:'#ACAEB3'}}>
          {label}
        </span>
      ))}
    </div>
  </div>
</div>
```

De gradient fill loopt nu visueel door tot de onderkant van de chart area (die direct grenst aan de labels div), en de labels staan als HTML text netjes gepositioneerd zonder SVG clipping issues.
