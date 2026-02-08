

## Sidebar iconen herstellen naar referentie

De huidige `muted-foreground` kleur (#73747B) is te licht/grijs. De referentie toont donkere, stevige iconen in de standaard `foreground` kleur.

### Wijzigingen in `src/components/layout/NestoSidebar.tsx`

**Regel 86 - Zap icoon:**
```tsx
// Huidig (te licht):
<Zap size={20} strokeWidth={0} className="fill-muted-foreground" />

// Nieuw (donker, solid filled):
<Zap size={20} strokeWidth={0} className="fill-foreground" />
```

**Regel 96 - PanelLeft icoon:**
```tsx
// Huidig (te licht, te dun):
<PanelLeft size={20} strokeWidth={1.5} className="text-muted-foreground" />

// Nieuw (donker, steviger stroke):
<PanelLeft size={20} strokeWidth={2} className="text-foreground" />
```

### Waarom

- `fill-foreground` / `text-foreground` gebruikt de standaard donkere tekstkleur die overeenkomt met de referentie
- PanelLeft krijgt `strokeWidth={2}` voor een steviger, dikker uiterlijk zoals in het voorbeeld
- Geen hardcoded hex kleuren, dus dark mode werkt automatisch
- Zap blijft `strokeWidth={0}` (solid filled shape zonder outline)

| Eigenschap | Huidig | Nieuw |
|---|---|---|
| Zap kleur | fill-muted-foreground (te grijs) | fill-foreground (donker) |
| PanelLeft kleur | text-muted-foreground (te grijs) | text-foreground (donker) |
| PanelLeft stroke | 1.5 (te dun) | 2 (steviger) |
