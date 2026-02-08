

## Fix Reserveringen Chart — Interactieve Dots + Geen Clipping

### Wat er nu mis is

De code bevat nog steeds statische dots (`CustomDot`) en de lijn wordt afgesneden door de border-radius van de card (`margin top: 0`). Het eerder goedgekeurde plan is niet correct doorgevoerd.

### Wijzigingen in `src/components/dashboard/ReservationsTile.tsx`

#### 1. CustomDot functie verwijderen (regel 33-39)

De hele `CustomDot` functie wordt verwijderd — niet meer nodig.

#### 2. AreaChart margin aanpassen (regel 60)

Van:
```
margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
```
Naar:
```
margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
```

Dit geeft 8px ruimte bovenin zodat de lijn niet wordt afgeknipt door de afgeronde hoeken van de card.

#### 3. Area props aanpassen (regel 74-75)

Van:
```
dot={<CustomDot />}
activeDot={false}
```
Naar:
```
dot={false}
activeDot={{ r: 5, fill: "#1d979e", stroke: "#fff", strokeWidth: 2 }}
```

- `dot={false}` — geen statische bolletjes op de lijn
- `activeDot` — bij hover verschijnt een teal bolletje met witte rand op het dichtstbijzijnde datapunt

### Resultaat

- Schone lijn zonder statische bolletjes
- Bij hover over de chart verschijnt een interactief teal bolletje
- Tooltip met datum + aantal reserveringen blijft werken
- De lijn wordt niet meer afgesneden door de card border-radius

### Bestanden

| Bestand | Actie |
|---|---|
| `src/components/dashboard/ReservationsTile.tsx` | `CustomDot` verwijderen, `dot={false}`, `activeDot` inschakelen, `margin top: 8` |
