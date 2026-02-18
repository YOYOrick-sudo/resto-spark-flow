
# Fix: SearchBar verdwijnt op smaller scherm

## Probleem
De toolbar bevat te veel elementen voor een enkele rij: ViewToggle + DateNavigator + quick-days + SearchBar + Walk-in + Reservering. Op smallere schermen wordt de SearchBar tot 0px gekrompen door `flex-1 min-w-0`, waardoor hij volledig verdwijnt.

## Oplossing
Verplaats de SearchBar van de toolbar-rij naar de filterrij eronder (`ReservationFilters`-rij). Daar is ruimte genoeg en past het logisch — zoeken IS een filter.

## Wijzigingen

**Bestand:** `src/pages/Reserveringen.tsx`

1. Verwijder de SearchBar wrapper (regels 130-136) uit de toolbar div
2. Plaats de SearchBar in de filterrij, naast de bestaande dropdowns (status, shift, type)
3. De toolbar bevat dan alleen: ViewToggle, DateNavigator, Walk-in, Reservering — past altijd

### Nieuwe toolbar structuur:
```
Rij 1: [ViewToggle] [DateNavigator + quick-days] ............... [Walk-in] [Reservering]
Rij 2: [Status ▾] [Shifts ▾] [Types ▾] [SearchBar___________]  2 reserveringen
```

### Technisch
- SearchBar verplaatsen naar na de `ReservationFilters` component, op dezelfde rij
- De filterrij wrapper aanpassen zodat SearchBar rechts uitlijnt met `ml-auto`
- Geen nieuwe componenten nodig, alleen verplaatsing van bestaande elementen
