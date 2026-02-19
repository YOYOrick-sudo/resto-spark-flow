

# Fix: Rode "NU"-lijn loopt door de sticky kolom

## Oorzaak
De `NowIndicator` is een absoluut gepositioneerd element op het bovenste niveau van de grid-container. De `left`-positie wordt berekend als `STICKY_COL_WIDTH + position`, waardoor de lijn fysiek begint in het bereik van de sticky kolom. De sticky cellen zitten genest in rij-divs, waardoor hun `z-40` alleen werkt binnen hun eigen stacking context en niet boven de `z-30` van de NowIndicator op het hogere DOM-niveau.

## Oplossing
Verplaats de `NowIndicator` naar binnen de timeline-area (na de sticky kolom) in plaats van hem over de hele breedte te positioneren. Dit is hetzelfde patroon als `GridLines` (regel 70) die al `left: STICKY_COL_WIDTH` op de container zet.

## Technische wijziging

### `src/components/reserveringen/ReservationGridView.tsx`

**NowIndicator component aanpassen** (regels 224-234):

1. Wrap de twee absolute divs in een container-div met `left: STICKY_COL_WIDTH` (net als GridLines)
2. Gebruik `position` als left-waarde in plaats van `STICKY_COL_WIDTH + position`
3. Dit zorgt ervoor dat de rode lijn nooit in het sticky-kolom-gebied wordt gerenderd

Concreet:
- Verander `leftPos` van `STICKY_COL_WIDTH + position` naar gewoon `position`
- Wrap de return in een container-div: `<div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: STICKY_COL_WIDTH + 'px' }}>`
- De lijn en de glow gebruiken dan `leftPos` (= `position`) als hun `left`-waarde

Geen andere bestanden worden aangepast.
