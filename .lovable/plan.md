

# Widget Header + Ticket Cards Redesign

## Wat verandert

### 1. Logo gecentreerd en groter (beide modes: embed + standalone)

**Embed header**: Logo gaat van `h-8 w-8` (32px) links-uitgelijnd naar `h-14` (56px) gecentreerd bovenin. De close-button blijft rechtsboven als absolute positie.

**Standalone header**: Logo gaat van `h-12` naar `h-16` (64px), blijft gecentreerd.

### 2. Restaurantnaam eronder

In beide modes wordt de naam onder het logo geplaatst als gecentreerde tekst. In embed-mode verandert de header van een horizontale rij (logo + naam + close) naar een verticale stack (logo + naam) met de close-button absoluut gepositioneerd.

```text
  Nu (embed):                    Straks (embed):
  [logo] Restaurant naam  [X]        [X]
                                   [  logo  ]
                                 Restaurant naam
```

### 3. Ticket cards kleiner en enterprise

De ticket-kaarten in `TicketSelectStep.tsx` worden verfijnd:
- **Afbeelding kleiner**: aspect ratio van `3/2` naar `2/1` (breder, minder hoog)
- **Subtiele shadow**: zachte multi-layer box-shadow in ruststand (`0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)`)
- **Hover shadow**: diepere shadow bij hover (`0 4px 16px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.05)`)
- **Border subtieler**: van `#e5e7eb` naar `rgba(0,0,0,0.06)` voor een zachtere rand
- **Padding iets compacter**: van `px-4 py-3` naar `px-4 py-2.5`

## Technische wijzigingen

### `src/pages/BookingWidget.tsx`

**Embed header (regels 110-130):**
- Verander van `flex items-center gap-3` naar `flex flex-col items-center gap-2 relative`
- Logo: `h-14 object-contain` (was `h-8 w-8`)
- Naam: `text-sm font-semibold text-gray-900 text-center`
- Close button: `absolute top-0 right-0` positie

**Standalone header (regels 133-146):**
- Logo: `h-16 object-contain` (was `h-12`)
- Naam blijft eronder, geen wijziging nodig (al gecentreerd)

### `src/components/booking/TicketSelectStep.tsx`

**Ticket cards (regels 27-79):**
- Aspect ratio div: van `aspect-[3/2]` naar `aspect-[2/1]`
- Default boxShadow: `0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)`
- Default borderColor: `rgba(0,0,0,0.06)` (was `#e5e7eb`)
- Content padding: `px-4 py-2.5` (was `px-4 py-3`)
- Hover classes aanpassen: `hover:shadow-lg` vervangen door inline hover styling via de bestaande style-prop

