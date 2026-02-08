

## Subtiele box-shadow toevoegen aan NestoCard

### Wat verandert er

Het `NestoCard` component krijgt een verfijnde schaduw en hover-effect, zodat kaarten visueel "zweven" boven de pagina.

### Aanpassingen

**Bestand: `src/components/polar/NestoCard.tsx`**

1. **Base shadow** — De huidige inline `boxShadow` style wordt vervangen door een enkele, schone shadow:
   - `box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04)`
   - Dit geldt voor alle cards (default state)

2. **Hover state voor clickable cards** (`hoverable={true}`):
   - `hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]`
   - `hover:-translate-y-px` (1px omhoog)
   - Transition op zowel shadow als transform (200ms ease) — zit al deels in het component via `transition-all duration-200`

3. **Geneste cards uitsluiten** — Een extra prop `nested` (default `false`) wordt toegevoegd. Wanneer `nested={true}`:
   - Geen box-shadow
   - Geen hover-transformatie
   - Dit geeft controle aan de ontwikkelaar om geneste cards plat te houden

### Technisch detail

```tsx
// Nieuwe prop
nested?: boolean;  // default false

// Base classes (niet-genest)
// shadow via inline style: "0 1px 2px rgba(0, 0, 0, 0.04)"

// Hoverable + niet-genest
// hover shadow via inline style of Tailwind arbitrary value
// hover:-translate-y-px transition-[box-shadow,transform] duration-200

// Genest (nested=true)
// shadow: "none", geen hover transform
```

De bestaande inline `boxShadow` met de `inset` wordt verwijderd en vervangen door de nieuwe, schonere shadow. De `hoverable` logica voor `hover:border-primary` en `hover:shadow-md` wordt aangepast naar de nieuwe specificatie.

### Impact

Alle plekken waar `NestoCard` wordt gebruikt (settings pages, assistant cards, detail layouts) krijgen automatisch de subtiele shadow. Geen wijzigingen nodig in andere bestanden, tenzij er ergens geneste cards zijn die de `nested` prop nodig hebben.

