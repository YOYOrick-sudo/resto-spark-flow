
# NestoPanel visueel volledig alignen met PanelDemo

## Overzicht
Er zijn 6 afwijkingen gevonden tussen het NestoPanel component en het PanelDemo ontwerp. Deze worden allemaal gecorrigeerd.

## Alle 6 afwijkingen en fixes

| # | Wat | PanelDemo (gewenst) | NestoPanel (nu) | Fix |
|---|---|---|---|---|
| 1 | Reveal header hoogte | h-10 | h-12 | h-12 naar h-10 |
| 2 | Reveal header font | font-medium | font-semibold | font-semibold naar font-medium |
| 3 | Reveal header border | geen | border-b border-border/50 | border-b verwijderen |
| 4 | Desktop border-radius | rounded-2xl | geen | rounded-l-2xl toevoegen |
| 5 | +Reservering breedte | 460px (default) | 480px | width prop verwijderen |
| 6 | Walk-in breedte | 460px (default) | 400px | width prop verwijderen |

## Wijzigingen per bestand

### Bestand 1: `src/components/polar/NestoPanel.tsx`

**Reveal header (regel 60):**
- `h-12` wordt `h-10`
- `border-b border-border/50` wordt verwijderd uit de className

**Reveal header titel (regel 66):**
- `font-semibold` wordt `font-medium`

**Desktop panel container (regel 110-111):**
- `rounded-l-2xl` toevoegen aan de classNames zodat het panel afgeronde linkerhoeken krijgt

### Bestand 2: `src/components/reservations/CreateReservationSheet.tsx`

**CreateReservationSheet (regel 262):**
- `width="w-[480px]"` verwijderen, zodat de default `w-[460px]` wordt gebruikt

**WalkInSheet (regel 545):**
- `width="w-[400px]"` verwijderen, zodat de default `w-[460px]` wordt gebruikt

## Wat niet wijzigt
- Alle form logica, state, hooks en data flows blijven identiek
- De Reserveringen.tsx pagina hoeft niet te wijzigen
- IntersectionObserver, footer, mobile Sheet fallback blijven ongewijzigd
- Floating X-button positie en gedrag blijven hetzelfde

## Resultaat
Beide panels worden pixel-perfect gelijk aan het PanelDemo ontwerp: compacte reveal header (h-10) zonder border, font-medium titel, afgeronde linkerhoeken (rounded-l-2xl), en een consistente breedte van 460px.
