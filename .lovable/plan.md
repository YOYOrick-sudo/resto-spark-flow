

# Fix: Wachtlijst CTA verschijnt niet bij volgeboekte dag

## Probleem

`flatSlots` bevat ALLE slots inclusief onbeschikbare (`available: false`). De conditie `flatSlots.length === 0` is alleen `true` als er helemaal geen shifts/slots bestaan — niet als alles volgeboekt is.

## Oplossing

Voeg een `hasAvailableSlots` check toe naast `flatSlots`:

```tsx
const hasAvailableSlots = flatSlots.some(({ slot }) => slot.available);
```

Wijzig de render-conditie van:
```tsx
flatSlots.length === 0 ? (waitlist UI) : (slot grid)
```
naar:
```tsx
flatSlots.length === 0 || !hasAvailableSlots ? (waitlist UI) : (slot grid)
```

Wanneer `!hasAvailableSlots` maar er wél slots zijn, tonen we de wachtlijst CTA **boven** de gedimde tijdslots zodat de gast ziet welke tijden er normaal zijn én zich op de wachtlijst kan zetten.

## Bestand

| Bestand | Wijziging |
|---|---|
| `src/components/booking/SelectionStep.tsx` | `hasAvailableSlots` memo toevoegen, render-conditie aanpassen |

