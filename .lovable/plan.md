

## Sidebar iconen aanpassen naar referentie

De huidige iconen gebruiken `#17171C` (bijna zwart) wat te hard/fel is. In de referentie zijn de iconen een **zachter donkergrijs**, meer in lijn met `text-muted-foreground` styling.

### Wijzigingen in `src/components/layout/NestoSidebar.tsx`

**Zap icoon (regel 86):**
- Kleur wijzigen van `#17171C` naar een zachtere kleur via Tailwind class
- Gebruik `className="text-muted-foreground"` met `fill="currentColor"` zodat het automatisch de juiste tint pakt

**PanelLeft icoon (regel 96):**
- Zelfde aanpak: `className="text-muted-foreground"` in plaats van hardcoded `color="#17171C"`

### Concrete code

Regel 86 - Zap:
```tsx
// Was:
<Zap size={20} strokeWidth={0} fill="#17171C" />

// Wordt:
<Zap size={20} strokeWidth={0} className="fill-muted-foreground" />
```

Regel 96 - PanelLeft:
```tsx
// Was:
<PanelLeft size={20} strokeWidth={1.5} color="#17171C" />

// Wordt:
<PanelLeft size={20} strokeWidth={1.5} className="text-muted-foreground" />
```

### Waarom

- `text-muted-foreground` is `#73747B` - een zacht donkergrijs dat past bij de referentie
- Geen hardcoded kleuren meer, werkt ook automatisch in dark mode
- Het Zap icoon gebruikt `fill-muted-foreground` (Tailwind fill utility) omdat het een filled shape is zonder stroke
- Het PanelLeft icoon gebruikt `text-muted-foreground` omdat Lucide stroke-iconen `currentColor` via `color` property gebruiken

| Eigenschap | Huidig | Nieuw |
|---|---|---|
| Zap fill | #17171C (hard zwart) | fill-muted-foreground (#73747B) |
| PanelLeft color | #17171C (hard zwart) | text-muted-foreground (#73747B) |
| Dark mode | Werkt niet | Automatisch correct |

