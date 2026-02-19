

# Ring Verwijderen + Enterprise Hover Effect

## Wat verandert

1. **Inset ring verwijderen** -- De accentColor inset box-shadow ring wordt weggehaald. De button krijgt alleen nog de subtiele drop-shadow voor diepte.

2. **Enterprise hover effect** -- Een verfijnd hover-effect dat professioneel aanvoelt:
   - Zachte `translateY(-2px)` lift (blijft)
   - De achtergrondkleur wordt subtiel lichter via de bestaande `darkenHex` helper (maar dan met negatieve waarde, oftewel lighten)
   - De drop-shadow wordt iets groter en zachter
   - Smooth `0.25s cubic-bezier` transition voor een vloeiend gevoel

## Technische wijzigingen

### `public/widget.js`

**Ring verwijderen (regels 211-216):**
- `glassInset` en `glassInsetHover` worden teruggezet naar lege strings (geen inset shadow meer)
- `shadowRest` wordt: `0 2px 8px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06)` (subtiele float-shadow)
- `shadowHover` wordt: `0 6px 20px rgba(0,0,0,0.12), 0 12px 36px rgba(0,0,0,0.08)` (diepere shadow bij hover)

**Enterprise hover toevoegen:**
- Bereken een `hoverColor` met `darkenHex(color, -8)` (8% lichter) voor de hover-achtergrond
- Bij `mouseenter`: stel `backgroundColor` in op `hoverColor` naast de bestaande lift + shadow
- Bij `mouseleave`: reset `backgroundColor` naar `color`
- Verander de transition naar `transition:transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s cubic-bezier(0.4,0,0.2,1), background-color 0.25s cubic-bezier(0.4,0,0.2,1)` voor een vloeiende ease

**Active/press state (blijft):**
- `scale(0.98)` bij pointerdown voor tactiele feedback

Dit geeft een clean, enterprise-level hover: de button "licht op" en tilt subtiel omhoog met een diepere schaduw, zonder ring of gimmicks.

