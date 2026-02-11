

# Fix: NestoCard zichtbaarheid in dark mode

## Probleem

De NestoCard shadow gebruikt vaste `rgba(0, 0, 0, 0.08)` waarden. Op een donkere achtergrond is zwart-op-zwart onzichtbaar -- de card smelt samen met de pagina.

## Oplossing

Voeg een subtiele border toe in dark mode als extra visuele afbakening, naast de shadow. Dit volgt het patroon van Linear en Stripe die in dark mode ook een lichte border gebruiken.

## Wijziging in `NestoCard.tsx`

Voeg een `dark:border dark:border-border/50` toe aan top-level (niet-nested) cards. Dit zorgt voor:

- **Light mode**: Geen verandering -- shadow blijft de primaire afbakening (geen border)
- **Dark mode**: Subtiele border als fallback omdat shadow onzichtbaar is

De shadow waarden blijven ongewijzigd (ze doen geen kwaad in dark mode, ze zijn alleen niet zichtbaar).

### Concrete class toevoeging

```
// Was (top-level card):
"bg-card text-card-foreground ..."

// Wordt:
"bg-card text-card-foreground dark:border dark:border-border/50 ..."
```

De `nested` variant heeft al `border border-border/40` en wordt niet aangepast.

### Hover shadow

De hover shadow (`0 4px 12px rgba(0, 0, 0, 0.08)`) is in dark mode ook onzichtbaar. Optioneel kan de hover state in dark mode een lichtere border krijgen: `dark:hover:border-border/70`.

## Scope

Alleen `src/components/polar/NestoCard.tsx` wijzigt. Dit heeft effect op alle NestoCards in het hele project.

## Impact op CARD_SHADOWS.md

Update de border-regels tabel:

| Context | Border |
|---------|--------|
| Top-level (light) | Geen -- shadow is voldoende |
| Top-level (dark) | `dark:border dark:border-border/50` als fallback |
| Nested | `border border-border/40` (ongewijzigd) |

