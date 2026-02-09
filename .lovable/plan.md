
# Switch transitie verfijnen en standaardiseren

## Probleem
De Switch voelt "houterig" omdat:
1. `transition-colors` op de root en `transition-transform` op de thumb gebruiken Tailwind's default van `150ms ease` — te kort en te abrupt voor een premium gevoel
2. De SortableTableRow heeft een inline mini-switch (`h-4 w-7`) maar de thumb translate-waarden zijn nog op de standaard maat berekend, waardoor de thumb niet goed past

## Oplossing

### 1. Base Switch component (`src/components/ui/switch.tsx`)

**Root element:**
- Vervang `transition-colors` door `transition-all duration-200 ease-in-out` voor een vloeiendere kleurovergang

**Thumb element:**
- Vervang `transition-transform` door `transition-all duration-200 ease-in-out` zodat de slide-animatie soepeler is en consistent met de root

### 2. Mini-switch in SortableTableRow (`src/components/settings/tables/SortableTableRow.tsx`)

De inline override `className="h-4 w-7 data-[state=checked]:bg-success"` verandert de track-afmetingen maar niet de thumb. Met een track van 28px breed en een thumb van 16px breed past dat niet.

**Fix:** Voeg thumb-specifieke overrides toe via de `[&>span]` selector:
```
className="h-[18px] w-[32px] [&>span]:h-[12px] [&>span]:w-[12px] [&>span]:data-[state=checked]:translate-x-[15px] [&>span]:data-[state=unchecked]:translate-x-[1px] data-[state=checked]:bg-success"
```

Dit zorgt dat de mini-switch proportioneel klopt met kleinere thumb en correcte translate-waarden.

## Alle Switch-locaties in het project (geverifieerd)

| Bestand | Type | Aanpassing |
|---|---|---|
| `switch.tsx` (base) | Base component | Transitie verbeteren |
| `SortableTableRow.tsx` | Inline mini-switch | Thumb proportie fixen |
| `ReminderSettingsSection.tsx` | Standaard | Erft van base, geen wijziging |
| `PhaseConfigCard.tsx` | Standaard | Erft van base, geen wijziging |
| `TaskTemplateList.tsx` | Standaard | Erft van base, geen wijziging |
| `TableModal.tsx` (2x) | Standaard | Erft van base, geen wijziging |
| `TableGroupModal.tsx` | Standaard | Erft van base, geen wijziging |

## Resultaat
Alle switches in het systeem bewegen soepel met een consistente `200ms ease-in-out` transitie. De mini-switch in de tafeltabel is proportioneel correct.
