

# Ticket Cards: Premium Enterprise Styling

## Wat verandert

De ticket cards krijgen meer diepte en een premium feel door:

1. **Sterkere shadow** -- de huidige shadow is erg subtiel (`0.04` en `0.03` opacity). Wordt een duidelijkere layered shadow die diepte geeft.
2. **Hover shadow** -- bij hover een grotere, zachtere shadow voor een "lift" effect samen met de bestaande `translateY`.
3. **Meer padding** in de content area voor een ruimer, luxer gevoel.
4. **Subtiele border** -- een heel lichte `rgba(0,0,0,0.04)` border voor extra definitie op de gebroken-wit achtergrond.

## Technische wijzigingen

### `src/components/booking/TicketSelectStep.tsx`

**Shadow upgrade (regel 36-38):**
- Default: `0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)` + `inset 0 0 0 1px rgba(0,0,0,0.04)`
- Selected: bestaande primary ring + `0 8px 24px -4px rgba(0,0,0,0.12)`

**Hover transition (regel 33):**
- `duration-150` wordt `duration-200` voor soepelere hover
- Hover shadow via inline `onMouseEnter`/`onMouseLeave` state, of via een CSS class

**Content padding (regel 69):**
- `px-4 py-2.5` wordt `px-5 py-3.5` voor meer ademruimte

**Gap tussen cards (regel 21):**
- `gap-3` wordt `gap-4` voor meer ruimte tussen tickets

