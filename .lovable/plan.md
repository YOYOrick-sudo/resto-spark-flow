

## Zoekbalk iets prominenter maken

De zoekbalk krijgt een subtiel zwaardere border voor net iets meer visuele aanwezigheid, zonder overdreven te worden.

### Wijziging in `src/components/layout/NestoSidebar.tsx`

**Regel 110 - zoekbalk div:**
```tsx
// Was:
<div className="w-full h-9 pl-9 pr-12 bg-background border border-border rounded-lg text-sm text-muted-foreground flex items-center hover:border-primary/40 transition-colors">

// Wordt:
<div className="w-full h-9 pl-9 pr-12 bg-background border-[1.5px] border-border rounded-lg text-sm text-muted-foreground flex items-center hover:border-primary/40 transition-colors">
```

De enige wijziging is `border` naar `border-[1.5px]` — een heel subtiele versterking van de rand zodat de zoekbalk net iets meer opvalt zonder het ontwerp te verstoren.

