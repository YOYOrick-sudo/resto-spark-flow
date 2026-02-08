

## Reserveringen Chart — Bolletjes op Alle Datapunten

### Probleem

Nu is er alleen een bolletje op het laatste datapunt (vandaag). De andere 6 dagen hebben geen visuele indicator op de lijn, waardoor het onduidelijk is welk punt bij welke dag hoort.

### Oplossing

Alle 7 datapunten krijgen een klein bolletje op de lijn, zodat de dag-labels visueel gekoppeld zijn aan hun positie op de grafiek. Het "vandaag"-bolletje blijft groter en opvallender.

### Wijzigingen in `src/components/dashboard/ReservationsTile.tsx`

#### CustomDot functie aanpassen

De huidige `CustomDot` toont alleen een bolletje bij het laatste punt. Dit wordt aangepast:

- **Vandaag (laatste punt)**: Groot bolletje (r=4), teal fill, witte stroke — blijft zoals nu
- **Overige dagen**: Klein bolletje (r=2.5), lichtgrijs fill (#ACAEB3), zonder stroke — subtiel maar zichtbaar genoeg om de connectie met de label eronder te tonen

Zo is er een duidelijke visuele lijn van label naar datapunt, zonder dat de chart te druk wordt.

### Bestanden

| Bestand | Actie |
|---|---|
| `src/components/dashboard/ReservationsTile.tsx` | `CustomDot` aanpassen: alle punten een bolletje, vandaag groter/teal, overige kleiner/grijs |

### Resultaat

- Elk dag-label (M D W D V Z Z) heeft een bijbehorend bolletje direct erboven op de lijn
- Vandaag springt eruit met een groter teal bolletje
- De overige dagen hebben subtiele grijze bolletjes
- De connectie tussen label en datapunt is direct zichtbaar

