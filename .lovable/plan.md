
# Fix: Doorschemerende tafels bij panel overlay

## Root Cause

De sticky left-column cellen in de Grid View (area headers, tafelnamen) gebruiken `z-[60]`. De NestoPanel overlay gebruikt `z-[70]`. Normaal gesproken zou `z-[70]` winnen, maar er is geen **stacking context** op de grid container. Hierdoor concurreren de sticky elementen rechtstreeks met de fixed overlay in de root stacking context, en door browser paint-order gedrag van `position: sticky` elementen schemeren ze door de overlay heen.

## Oplossing

Voeg `isolate` (CSS `isolation: isolate`) toe aan de grid container. Dit creert een nieuwe stacking context die ALLE z-indices binnen de grid bevat. De hele grid wordt dan een enkele laag (z-auto) in de root stacking context. De NestoPanel overlay op `z-[70]` zit daar gegarandeerd boven.

## Wijziging

### `src/components/reserveringen/ReservationGridView.tsx` (regel 556)

```
Was:  <div className="relative h-full overflow-hidden bg-card">
Wordt: <div className="relative h-full overflow-hidden bg-card isolate">
```

## Z-index overzicht na fix

| Element | Z-index | Stacking Context |
|---------|---------|-----------------|
| Reserveringsblokken | z-10 | Grid (contained) |
| Sticky headers | z-[45] | Grid (contained) |
| NU-lijn | z-50 | Grid (contained) |
| Sticky left-column | z-[60] | Grid (contained) |
| **NestoPanel overlay + panel** | **z-[70]** | **Root (boven alles)** |

## Scope

- 1 bestand, 1 woord toevoegen (`isolate`)
- Geen NestoPanel wijzigingen
- Geen z-index wijzigingen
- Alle sticky elementen blijven correct werken binnen de grid
