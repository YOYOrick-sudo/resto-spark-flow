

## Reserveringen Chart — Labels Over Volledige Breedte

### Probleem

De dag-labels (M D W D V Z Z) zitten nu in een container van 50% breedte, rechts uitgelijnd met padding. Hierdoor zijn ze samengeperst in de rechterhelft. Ze moeten over de **volledige breedte** van de card verdeeld worden, net als de Polar.sh revenue chart.

### Oplossing

#### 1. Data aanpassen: 7 datapunten, niet 14

De huidige chart heeft 14 datapunten maar slechts 7 dag-labels. Dit maakt alignment onmogelijk. De oplossing is om de data te beperken tot **7 datapunten** (de huidige week: ma t/m zo), zodat elke dag-label precies onder het bijbehorende datapunt valt.

Nieuwe mockData:
```text
M  -> 16
D  -> 19
W  -> 14
D  -> 24
V  -> 28
Z  -> 32
Z  -> 20 (vandaag)
```

#### 2. Labels over volledige breedte

De overlay div met dag-labels krijgt `width: 100%` (niet 50%) en geen `justify-end`. De labels worden gelijkmatig verdeeld over de volledige breedte:

- Container: `absolute bottom-0 left-0 right-0`
- Padding: `px-3 pb-2` (kleine marge zodat eerste/laatste label niet tegen de rand plakt)
- Labels: `flex w-full`, elke label `flex-1 text-center`

#### 3. Bolletje op de lijn behouden

De `CustomDot` functie blijft hetzelfde — toont alleen een wit-omrande teal dot op het laatste datapunt (vandaag/zondag).

#### 4. Edge-to-edge chart

De `marginRight: -5` en `overflow-hidden` op de NestoCard blijven behouden voor de rechterrand fix.

### Bestanden

| Bestand | Actie |
|---|---|
| `src/components/dashboard/ReservationsTile.tsx` | mockData terugbrengen naar 7 punten (ma-zo), labels overlay naar 100% breedte met px-3 padding |

### Resultaat

- 7 dag-labels (M D W D V Z Z) lopen van links naar rechts over de volledige card breedte
- Elke label correspondeert met een datapunt op de lijn
- Teal bolletje op de lijn bij "vandaag" (laatste Z)
- Gradient loopt edge-to-edge en achter de labels door
