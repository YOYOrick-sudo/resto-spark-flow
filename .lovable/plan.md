

# Widget Selectie Card — Meer Contrast & Nesto-Stijl

## Probleem

De witte selectie-kaart (`bg-white rounded-2xl border border-gray-100`) op de `#FAFAFA` achtergrond heeft nauwelijks contrast. De shadow (`0 1px 4px rgba(0,0,0,0.06)`) is te subtiel. Het "zweeft" niet — het valt weg.

## Oplossing

De selectie-card en andere content-blokken meer visuele diepte geven, in lijn met het Nesto design system (shadow als primaire afbakening, niet borders).

### Wijzigingen

**1. Selectie-card (datum/gasten/tijd) — `SelectionStep.tsx` regel 205**

Huidige stijl:
```
bg-white rounded-2xl border border-gray-100
boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
```

Nieuwe stijl:
```
bg-white rounded-2xl border border-gray-200/60
boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)'
```

Sterkere shadow (dubbele laag zoals NestoCard), iets zichtbaardere border.

**2. Ticket cards — `SelectionStep.tsx`**

Zelfde shadow-upgrade voor de ticket selectie kaarten. Niet-geselecteerde tickets krijgen dezelfde verhoogde shadow.

**3. Gasten stepper — `SelectionStep.tsx`**

De gasten-rij (Minus/Plus knoppen) zit in dezelfde card, geen aparte wijziging nodig.

**4. Tijd-slots**

Tijd-pills zijn klein genoeg — die hoeven geen extra shadow. Ze zitten al binnen de card.

**5. Summary dropdown (stap 2) — `BookingWidget.tsx` regel 220**

Zelfde shadow-upgrade als de selectie-card:
```
boxShadow: '0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)'
```

### Wat NIET verandert
- Achtergrondkleur (#FAFAFA) blijft
- Rounded-2xl blijft
- Brand color systeem blijft
- Functionele logica

### Bestanden
| Bestand | Wijziging |
|---|---|
| `src/components/booking/SelectionStep.tsx` | Shadow + border upgrade op selectie-card en ticket cards |
| `src/pages/BookingWidget.tsx` | Shadow upgrade op summary dropdown |

