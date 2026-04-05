

# Fix: Onleesbare invoervelden in booking widget

## Probleem

De globale CSS in `index.css` (regels 246-261) past `border: 1.5px solid hsl(var(--border))` toe op ALLE `input`, `textarea` en `select` elementen. In dark mode wordt `--border` donker (230 6% 20%), en andere CSS-variabelen (`--foreground`, `--background`) worden ook donker. De widget-inputs erven deze waarden, waardoor tekst en borders onzichtbaar worden tegen de witte achtergrond.

## Oplossing

Wrap de `BookingWidget` output in een `<div className="light">` container. Dit forceert alle CSS-variabelen terug naar hun light-mode waarden binnen de widget, ongeacht het dashboard-thema.

### Wijziging in `src/pages/BookingWidget.tsx`

De outer wrapper div (die met `backgroundColor: '#FAFAFA'`) krijgt een extra `light` class:

```tsx
<div className="light" style={{ colorScheme: 'light' }}>
  {/* bestaande widget content */}
</div>
```

Dit isoleert de widget volledig: alle `hsl(var(--border))`, `hsl(var(--foreground))` etc. resolven naar de `:root` (light) waarden.

## Bestanden

| Bestand | Actie |
|---|---|
| `src/pages/BookingWidget.tsx` | Wrap output in `<div className="light">` |

