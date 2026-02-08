

## Dunne lijn onder header verwijderen

De header-div op regel 72 heeft `border-b border-border` wat een dunne scheidingslijn toont tussen de header en de zoekbalk. Deze wordt verwijderd.

### Wijziging in `src/components/layout/NestoSidebar.tsx`

**Regel 72:**
```tsx
// Was:
<div className="p-4 border-b border-border">

// Wordt:
<div className="p-4">
```

Alleen `border-b border-border` wordt verwijderd, de padding blijft behouden.

