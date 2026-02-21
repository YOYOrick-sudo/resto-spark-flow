
# Fix Onboarding Badges: Zichtbaarheid in Light en Dark Mode

## Probleem

De NestoBadge varianten `success`, `warning` en `error` (gebruikt in o.a. `PhaseDurationBadge`) zijn slecht zichtbaar omdat:

1. **Dark mode**: De achtergrondkleuren (`--success-light`, `--warning-light`, `--error-light`) zijn ~97% lightness (bijna wit). Op een donkere card achtergrond ontstaat een hard, uitgewassen blok met nauwelijks zichtbare tekst.
2. **Light mode**: De combinatie van 97% lightness achtergrond met lichte statuskleuren als tekst biedt onvoldoende contrast.

Er zijn **geen dark mode overrides** voor deze `-light` tokens in `src/index.css`.

## Oplossing

### Bestand: `src/index.css` — Dark mode tokens toevoegen

Binnen het `.dark` blok (na regel ~184) worden de status-light tokens overschreven naar subtiele, transparante tints die passen bij het enterprise dark theme:

| Token | Light mode (huidig) | Dark mode (nieuw) |
|-------|--------------------|--------------------|
| `--success-light` | `141 76% 97%` (bijna wit) | `160 84% 20%` (donker groen) |
| `--pending-light` | `36 100% 97%` (bijna wit) | `36 80% 20%` (donker amber) |
| `--warning-light` | `30 100% 95%` (bijna wit) | `30 80% 20%` (donker oranje) |
| `--error-light` | `0 86% 97%` (bijna wit) | `0 70% 22%` (donker rood) |

Dit zorgt ervoor dat de badge-achtergrond in dark mode een subtiele, donkere tint krijgt (vergelijkbaar met hoe Linear/Stripe status-badges doen), terwijl de tekstkleur (`--success`, `--pending`, etc.) goed contrasteert.

### Bestand: `src/components/polar/NestoBadge.tsx` — Geen wijzigingen nodig

De huidige variant-definities (`bg-success-light text-success`, etc.) werken automatisch correct zodra de CSS tokens dark mode waarden hebben.

## Resultaat

- **Light mode**: Ongewijzigd (zachte pastel achtergronden)
- **Dark mode**: Donkere, getinte achtergronden met heldere statuskleuren als tekst — hoog contrast, enterprise-consistent
