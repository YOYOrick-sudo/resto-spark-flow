

# Ingecheckt status visueel onderscheiden van Bevestigd

## Probleem
Beide statussen gebruiken teal-varianten waardoor ze nauwelijks te onderscheiden zijn:
- **Bevestigd**: dot `#1d979e`, `text-primary`, `bg-primary/[0.08]`
- **Ingecheckt**: dot `#14B8A6`, `text-primary`, `bg-primary/15`

## Oplossing
Ingecheckt krijgt een groene (emerald) kleur die "aanwezig / actief" communiceert en duidelijk verschilt van het teal van Bevestigd.

| Status | Dot kleur | Text | Achtergrond |
|---|---|---|---|
| Bevestigd (blijft) | `#1d979e` (teal) | `text-primary` | `bg-primary/[0.08]` |
| Ingecheckt (nieuw) | `#10B981` (emerald) | `text-emerald-700` / dark: `text-emerald-400` | `bg-emerald-50` / dark: `bg-emerald-900/20` |

## Wijziging

### Bestand: `src/types/reservation.ts`

De `seated` entry in `STATUS_CONFIG` wordt aangepast:

```
dotColor: '#10B981'        (was '#14B8A6')
textClass: 'text-emerald-700 dark:text-emerald-400'  (was 'text-primary')
bgClass: 'bg-emerald-50 dark:bg-emerald-900/20'      (was 'bg-primary/15')
```

## Wat niet wijzigt
- Alle andere statussen blijven identiek
- Geen componenten hoeven te wijzigen -- ze lezen allemaal uit STATUS_CONFIG
- Grid view, list view, detail panel, badges werken automatisch mee

## Resultaat
Bevestigd = teal (gereserveerd, komt nog), Ingecheckt = groen (is er, actief). Direct visueel onderscheidbaar.
