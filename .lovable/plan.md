

# Fix: NestoCard dark mode border sterker maken

## Probleem

De huidige `dark:border-border/50` (50% opacity) is te zwak. Op de donkere achtergrond is het contrast onvoldoende en smelten de cards samen met de pagina-achtergrond.

## Oplossing

Verhoog de border opacity in dark mode van `/50` naar volledige sterkte, en geef hoverable cards een nog duidelijkere hover-border.

## Wijzigingen in `NestoCard.tsx`

| Was | Wordt |
|-----|-------|
| `dark:border dark:border-border/50` | `dark:border dark:border-border` |
| `dark:hover:border-border/70` | `dark:hover:border-border/80` |

Dit is een minimale change op regel 29 en 30.

## Wijziging in `CARD_SHADOWS.md`

Update de border-regels tabel:

| Context | Border |
|---------|--------|
| Top-level (light) | Geen -- shadow is voldoende |
| Top-level (dark) | `dark:border dark:border-border` (was `/50`) |
| Nested | `border border-border/40` (ongewijzigd) |

## Scope

Twee bestanden: `NestoCard.tsx` (2 regels) en `CARD_SHADOWS.md` (documentatie).
