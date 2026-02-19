
# Fix: "Niet toegewezen" moet eruitzien en werken als Pacing-blok

## Twee problemen gevonden

### 1. Achtergrond is transparant
De "Niet toegewezen" sectie gebruikt `bg-warning/5` (5% opacity). De rode "NU"-lijn schijnt er gewoon doorheen omdat de achtergrond bijna doorzichtig is. De pacing-rij gebruikt `bg-secondary` -- volledig opaque -- daarom werkt het daar wel.

### 2. Grid-lijnen zichtbaar
De "Niet toegewezen" sectie rendert dezelfde 15-minuten grid-streepjes als de tabelrijen (regels 323-334 in `UnassignedGridRow`). De pacing-rij heeft dit niet -- die heeft solide cellen met data. Hierdoor lijkt "Niet toegewezen" op een gewone tabelrij in plaats van op een header-achtig blok.

## Wat wordt gewijzigd

### `src/components/reserveringen/ReservationGridView.tsx` -- UnassignedGridRow

**Buitenste wrapper (regel 304):**
- Was: `bg-warning/5`
- Wordt: `bg-secondary` (opaque, zelfde als pacing)

**Sticky linkerkolom (regel 309):**
- Was: `bg-warning/5`
- Wordt: `bg-secondary` (opaque, consistent)

**De warning-kleur behouden we via de tekst en badge** (die zijn al oranje/warning gestyled), niet via de achtergrond.

**Quarter-slot grid lines verwijderen (regels 323-334):**
De `<div className="absolute inset-0 flex">` met alle quarter-slot divs wordt verwijderd. De reservatieblokken worden direct op een schone achtergrond getoond, net zoals de pacing-rij schone cellen heeft.

**Border-styling aanpassen:**
- Was: `border-b border-warning/30`
- Wordt: `border-b-2 border-border` (zelfde als pacing)

## Visueel resultaat

```text
TimelineHeader  : bg-card      | opaque | geen grid-lijnen | border-b-2
SeatedCountRow  : bg-secondary | opaque | eigen cellen     | border-b-2
Niet toegewezen : bg-secondary | opaque | geen grid-lijnen | border-b-2  <-- NA FIX
ZoneHeaders     : bg-secondary | ...
TableRows       : bg-card      | grid-lijnen zichtbaar
```

De rode lijn kan niet meer door een opaque achtergrond schijnen, en de sectie ziet er visueel uit als een zusterelement van de pacing-rij.
