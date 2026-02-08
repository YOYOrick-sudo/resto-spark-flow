

## Reserveringen Chart — Definitieve Fix

### Kernprobleem

Recharts splitst de chart in twee zones wanneer je een `XAxis` toevoegt: een **plot-zone** (waar de gradient/lijn tekent) en een **axis-zone** eronder. De gradient fill kan NOOIT doorlopen naar de axis-zone — dit is een harde beperking van Recharts. Daarom blijft er altijd een kale strook onder de gradient.

Tegelijkertijd voegt Recharts ~5px interne SVG padding toe aan de rechterkant, waardoor de lijn/gradient niet tot de rechterrand van de card reikt.

### Oplossing: Overlay Labels

De enige manier om het Polar.sh-effect te bereiken is:

1. **XAxis volledig verwijderen** uit de AreaChart
2. **Chart uitrekken tot de onderkant** van de card (geen ruimte reserveren voor labels)
3. **HTML labels absoluut positioneren** over de onderkant van de chart heen, zodat de gradient erachter doorloopt
4. **Negatieve margin rechts** om de Recharts SVG padding te compenseren

### Wijzigingen in `src/components/dashboard/ReservationsTile.tsx`

#### 1. XAxis verwijderen
De `XAxis` component en de `renderDayTick` functie worden volledig verwijderd.

#### 2. Chart wrapper met relative positioning
De wrapper div krijgt `position: relative` zodat de labels absoluut gepositioneerd kunnen worden.

#### 3. ResponsiveContainer hoogte
Terug naar `164` — de volledige hoogte is nu beschikbaar voor de chart (geen XAxis die ruimte inneemt).

#### 4. Labels als overlay
Een `div` met `position: absolute`, `bottom: 0`, `left: 0`, `right: 0` wordt over de chart heen gelegd. Binnen deze div:
- `padding: 0 24px 12px 0` (rechts 24px zodat labels niet buiten de card vallen, onder 12px voor ademruimte)
- `display: flex`, `justify-content: flex-end`
- De 7 labels staan in een container die ~50% van de breedte inneemt (want de eerste 7 datapunten hebben geen labels)
- Elke label is `flex-1 text-center`
- Laatste label: `color: #1d979e, fontWeight: 600`
- Overige labels: `color: #ACAEB3`

#### 5. Edge-to-edge fix
De wrapper div behoudt `style={{ marginRight: -5 }}` om de Recharts interne SVG padding te compenseren. De NestoCard heeft al `overflow-hidden` waardoor het overschot netjes wordt afgesneden.

### Resultaat

- De teal lijn en gradient lopen van linkerrand tot rechterrand
- De gradient loopt door tot de onderkant van de card
- De dag-labels (M D W D V Z Z) zitten IN de gradient, niet eronder
- Geen witte ruimte aan enige zijde

### Bestanden

| Bestand | Actie |
|---|---|
| `src/components/dashboard/ReservationsTile.tsx` | XAxis verwijderen, labels als absolute overlay, renderDayTick verwijderen |
