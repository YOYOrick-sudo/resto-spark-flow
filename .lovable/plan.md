

# Fix: TableSelector popover standaard onder de trigger openen

## Probleem
De popover opent nu boven de trigger-button. De gebruiker wil dat deze standaard **onder** de trigger opent.

## Oplossing
In `src/components/reservations/TableSelector.tsx` regel 169: voeg `side="bottom"` toe aan de `PopoverContent`.

Huidige code:
```
<PopoverContent className="..." align="start" sideOffset={4}>
```

Nieuwe code:
```
<PopoverContent className="..." align="start" side="bottom" sideOffset={4}>
```

Radix Popover kiest standaard automatisch de kant met de meeste ruimte. Door `side="bottom"` expliciet te zetten, forceert het de dropdown naar onder.

### Bestand: `src/components/reservations/TableSelector.tsx`
- Regel 169: `side="bottom"` toevoegen aan PopoverContent
