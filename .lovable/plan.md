

# Filterrij dunner/compacter maken

## Probleem
De filterrij neemt nu evenveel visuele ruimte in als de toolbar erboven, terwijl het een secundaire rij is die niet altijd actief gebruikt wordt.

## Oplossing
Maak de select-elementen en search in deze rij kleiner (h-8 i.p.v. h-10) en gebruik kleinere tekst, zodat de rij visueel terugtrekt.

## Wijzigingen

### 1. `src/components/polar/NestoSelect.tsx`
- Voeg een optionele `size` prop toe (`"sm" | "default"`)
- Bij `size="sm"`: gebruik `h-8 text-xs` i.p.v. `h-10 text-body` op de SelectTrigger

### 2. `src/components/reserveringen/ReservationFilters.tsx`
- Geef `size="sm"` mee aan alle drie de NestoSelect componenten
- Verklein de gap tussen elementen van `gap-4` naar `gap-3`
- Verklein de counter tekst van `text-sm` naar `text-xs`
- Pas de SearchBar wrapper aan met een kleinere hoogte via className

### 3. `src/components/polar/SearchBar.tsx`
- Voeg een optionele `size` prop toe (`"sm" | "default"`)
- Bij `size="sm"`: gebruik `h-8 text-xs` op het input-element

## Resultaat
De filterrij wordt ca. 8px dunner en voelt visueel als een subtiele, secundaire toolbar.

