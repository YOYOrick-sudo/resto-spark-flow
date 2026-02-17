
# Buttons in PanelDemo afstemmen op Design System

## Gevonden afwijkingen

| Knop | Huidige situatie | Moet zijn |
|------|-----------------|-----------|
| "Inchecken" (detail) | raw `<button>` + `rounded-button` (8px) | `NestoButton` variant="primary" (16px) |
| "Bewerken" (detail) | raw `<button>` + `rounded-button` | `NestoButton` variant="outline" (8px) |
| "Annuleren" (form footer) | raw `<button>` + `rounded-button` | `NestoButton` variant="ghost" (8px) |
| "Reservering aanmaken" (form footer) | raw `<button>` + `rounded-button` (8px) | `NestoButton` variant="primary" (16px) |

Twee problemen:
1. **Geen `NestoButton` gebruikt** -- raw `<button>` elementen missen de standaard focus-visible states, disabled styling, en loading support
2. **Primary buttons hebben verkeerde radius** -- `rounded-button` (8px) i.p.v. `rounded-button-primary` (16px)

## Wijzigingen

Bestand: `src/pages/PanelDemo.tsx`

### 1. Import toevoegen
Toevoegen aan de imports: `NestoButton` uit `@/components/polar/NestoButton`.

### 2. Detail mode buttons (regels 110-116)
Vervang de twee raw buttons door:
- `NestoButton` met `variant="primary"` + `leftIcon={<UserCheck />}` + `className="flex-1"` voor "Inchecken"
- `NestoButton` met `variant="outline"` voor "Bewerken"

### 3. Form mode footer (regels 183-188)
Vervang de twee raw buttons door:
- `NestoButton` met `variant="ghost"` voor "Annuleren"
- `NestoButton` met `variant="primary"` voor "Reservering aanmaken"

Dit zorgt ervoor dat:
- Primary buttons automatisch `rounded-button-primary` (16px) krijgen
- Outline/ghost buttons `rounded-button` (8px) krijgen
- Focus-visible, disabled, en hover states consistent zijn met de rest van het systeem
