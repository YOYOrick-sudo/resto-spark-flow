

# Ticket Cards: Ronder + Border verwijderen

## Wat verandert

De ticket cards worden ronder (van `rounded-xl` / 12px naar `rounded-2xl` / 16px) en de border wordt volledig verwijderd. De shadow doet al het werk als visuele afbakening -- precies het enterprise-principe uit het design system ("shadow vervangt border").

Bij selectie wordt in plaats van een border een subtiele `inset 0 0 0 2px` shadow gebruikt zodat de geselecteerde state zichtbaar blijft zonder een harde border-lijn.

## Technische wijziging

### `src/components/booking/TicketSelectStep.tsx`

**Button element (regel 33-42):**
- `rounded-xl` wordt `rounded-2xl` (16px)
- `border` class wordt verwijderd
- `borderColor` style wordt verwijderd
- Selected state shadow: `inset 0 0 0 2px ${primaryColor}` gecombineerd met de bestaande elevation shadow
- Default state: alleen de bestaande multi-layer shadow (geen border)

