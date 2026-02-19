

# Fix: "Niet toegewezen" licht oranje achtergrond behouden maar wel opaque

## Probleem
De achtergrond is nu `bg-secondary` (grijs) maar moet de licht-oranje tint behouden die het eerder had. Tegelijkertijd moet de achtergrond opaque blijven zodat de rode lijn er niet doorheen schijnt.

## Oplossing
Gebruik een opaque oranje achtergrond in plaats van een transparante. Dit doen we door `bg-warning/5` (transparant) te vervangen door een CSS-truc: een opaque achtergrond met een warning-overlay erop.

Concreet: we gebruiken een dubbele achtergrond via een `before` pseudo-element, of simpeler: we zetten `bg-secondary` als basis en voegen een `before`-laag toe met de warning-kleur.

De eenvoudigste aanpak: vervang `bg-secondary` door een inline style met een opaque kleur die overeenkomt met warning/5 op een witte/kaart-achtergrond. Maar dat is fragiel met dark mode.

Betere aanpak: gebruik `bg-secondary` als opaque basis en leg er `bg-warning/5` overheen via een extra div. Zo is de onderlaag opaque (blokkeert rode lijn) en de bovenlaag geeft de oranje tint.

## Technische wijzigingen

### `src/components/reserveringen/ReservationGridView.tsx` -- UnassignedGridRow

**Buitenste wrapper (regel 304):**
- Was: `bg-secondary`
- Wordt: `bg-secondary` met een extra `after` overlay voor de warning-tint
- Implementatie: voeg `relative` toe en een inner `<div className="absolute inset-0 bg-warning/5 pointer-events-none" />` als eerste kind

**Sticky linkerkolom (regel 309):**
- Zelfde aanpak: `bg-secondary relative` met een `<div className="absolute inset-0 bg-warning/5 pointer-events-none" />` als eerste kind

Dit geeft:
- Opaque `bg-secondary` basis die de rode lijn blokkeert
- Licht-oranje tint via de transparante warning-overlay erboven
- Werkt correct in zowel light als dark mode

