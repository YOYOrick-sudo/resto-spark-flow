

# Fix PhaseColumn achtergrondkleur

## Probleem

`PhaseColumn.tsx` regel 22 gebruikt `bg-secondary/30` — een verboden anti-pattern uit de Component Decision Guide (te lage opacity, onzichtbaar contrast).

## Wijziging

| Bestand | Regel | Huidig | Nieuw |
|---------|-------|--------|-------|
| `src/components/onboarding/PhaseColumn.tsx` | 22 | `bg-secondary/30 rounded-lg p-3` | `bg-secondary/50 border border-border/40 rounded-lg p-3` |

Dat is de enige aanpassing. Alle andere componenten op de onboarding pagina volgen de guide al correct.

