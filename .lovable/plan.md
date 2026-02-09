

# Switch dark mode verfijning

## Probleem
In dark mode is de unchecked switch te "intens" — de witte thumb tegen de donkere track heeft te veel contrast, en de border valt weg omdat `bg-muted` en `border-border` dezelfde kleur zijn.

## Oplossing
Subtielere dark mode styling via de bestaande Tailwind `dark:` modifier:

### `src/components/ui/switch.tsx`

| Eigenschap | Light mode (blijft) | Dark mode (nieuw) |
|---|---|---|
| Unchecked track | `bg-muted` | `dark:bg-muted/60` (zachter, minder contrast) |
| Unchecked border | `border-border` | `dark:border-border/60` (subtielere rand) |
| Thumb | `bg-white shadow-sm` | `dark:bg-white/90 dark:shadow-none` (iets gedempter, geen schaduw) |

Resultaat: de toggle oogt rustiger in dark mode zonder het light mode design te veranderen.
