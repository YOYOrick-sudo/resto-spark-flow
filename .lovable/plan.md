
# Reveal header: "Reservering · Gastnaam" tonen

## Probleem
De reveal header (sticky bar bovenaan bij scrollen) toont alleen "Reservering". Het zou "Reservering · Jan de Vries" moeten zijn, zodat je altijd weet welke reservering je bekijkt.

## Aanpak
In `NestoPanel` de IntersectionObserver callback uitbreiden: wanneer de content-titel uit beeld scrollt, lees de `textContent` van het `titleRef` element uit en toon die achter de `title` prop met een separator.

## Wijziging

### Bestand: `src/components/polar/NestoPanel.tsx`
- Voeg een `revealTitle` state toe (string) naast `titleVisible`
- In de IntersectionObserver callback: wanneer de titel uit beeld gaat, sla `titleRef.current.textContent` op in `revealTitle`
- In de reveal header: toon `{title} · {revealTitle}` in plaats van alleen `{title}`
- Als `revealTitle` leeg is (bijv. loading state), toon alleen `{title}`

## Resultaat
- Reveal header toont: **Reservering · Jan de Vries**
- Werkt automatisch voor alle panels die NestoPanel gebruiken (Walk-in, +Reservering, etc.)
- Geen wijzigingen nodig in ReservationDetailPanel of andere consumers
