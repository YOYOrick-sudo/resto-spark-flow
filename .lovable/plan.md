

## Sidebar iconen iets kleiner maken

Beide iconen in de sidebar header worden van `size={20}` naar `size={18}` gezet voor een subtiel kleiner formaat.

### Wijzigingen in `src/components/layout/NestoSidebar.tsx`

**Zap icoon (regel 86):**
```tsx
// Was:
<Zap size={20} strokeWidth={0} className="fill-foreground" />
// Wordt:
<Zap size={18} strokeWidth={0} className="fill-foreground" />
```

**PanelLeft icoon (regel 96):**
```tsx
// Was:
<PanelLeft size={20} strokeWidth={2} className="text-foreground" />
// Wordt:
<PanelLeft size={18} strokeWidth={2} className="text-foreground" />
```

Alleen de `size` property wijzigt, verder blijft alles hetzelfde.

