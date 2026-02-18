

# Fix: SearchBar overlapt knoppen bij smaller scherm

## Probleem
De SearchBar wrapper heeft `flex-1 min-w-0 max-w-xs ml-auto`. Op volledig scherm werkt dit prima, maar bij smallere breedtes neemt de SearchBar nog steeds te veel ruimte in omdat:
- `max-w-xs` = 320px, dat is heel breed voor een toolbar met meerdere elementen
- De input zelf heeft een intrinsieke minimumbreedte waardoor `min-w-0` niet genoeg helpt
- Er is geen `overflow-hidden` op de wrapper, waardoor de input visueel buiten zijn container kan lopen

## Oplossing

**Bestand:** `src/pages/Reserveringen.tsx` (regel 130)

Wijzig de SearchBar wrapper classes van:
```
flex-1 min-w-0 max-w-xs ml-auto
```
naar:
```
flex-1 min-w-0 max-w-[220px] ml-auto overflow-hidden
```

- `max-w-[220px]` i.p.v. `max-w-xs` (320px) -- geeft 100px meer ruimte aan de rest van de toolbar
- `overflow-hidden` -- voorkomt dat de input visueel buiten de wrapper lekt

Dit is een eenregelige CSS-wijziging, geen structurele verandering.
