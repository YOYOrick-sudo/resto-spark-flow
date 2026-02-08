

## Sidebar Header Redesign

### Samenvatting

Volledige visuele opschoning van de sidebar: subtielere header-iconen, een compact zoekveld met ⌘K badge, navigatie gegroepeerd met section labels, en een nieuwe footer met locatie + gebruikersprofiel.

### Wijzigingen

**1. `src/components/layout/NestoSidebar.tsx` - Header iconen (regels 93-129)**

De twee knoppen (Zap, PanelLeft) worden subtieler:
- Verwijder de `hoveredButton` state en de `onMouseEnter`/`onMouseLeave` handlers
- Iconen: `size={16}` (was 18)
- Default: `text-muted-foreground`
- Hover: `hover:text-foreground hover:bg-muted/50` (was `bg-primary text-primary-foreground`)
- Focus: `focus-visible:outline-none focus-visible:ring-0`
- Container: `p-1.5 rounded-md transition-colors` (was `w-8 h-8 flex items-center justify-center`)
- Gap blijft `gap-1`

**2. `src/components/layout/NestoSidebar.tsx` - Search bar toevoegen (na header, voor nav)**

Nieuw element tussen de header `div` en de `nav`:
```
<div className="px-4 mt-2 mb-4">
  <div className="relative">
    <Search icon links (h-4 w-4, text-muted-foreground)
    <input h-9 (36px), pl-9, bg-muted/40, border-0, rounded-lg, text-sm, placeholder "Zoeken..."
    <span rechts: "⌘K" badge met text-[10px] text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded-md
  </div>
</div>
```

Dit is een visueel-only element voor nu (geen functionele zoeklogica). State wordt lokaal beheerd maar doet nog niets.

**3. `src/lib/navigation.ts` - Groepering toevoegen**

Voeg een optioneel `section` veld toe aan `MenuItem`:
```typescript
export interface MenuItem {
  // ...existing
  section?: string; // 'OPERATIE' | 'SERVICE' | 'BEHEER'
}
```

Toewijzing:
- Dashboard, Assistent: geen section (bovenste groep)
- Reserveringen, Keuken, Kaartbeheer: `section: 'OPERATIE'`
- Takeaway, Service: `section: 'SERVICE'`
- Finance, Settings: `section: 'BEHEER'`

Support en Documentatie worden als disabled sub-items aan Settings toegevoegd:
```typescript
{ id: 'settings-support', label: 'Support', disabled: true },
{ id: 'settings-documentatie', label: 'Documentatie', disabled: true },
```

**4. `src/components/layout/NestoSidebar.tsx` - Section labels renderen (nav sectie, regels 134-262)**

In de `nav` loop: check of het huidige item een nieuwe `section` heeft vs het vorige item. Als ja, render een section label:
```tsx
<li className="px-3 pt-5 pb-1">
  <span className="text-[11px] font-medium text-muted-foreground/60 tracking-widest uppercase">
    {item.section}
  </span>
</li>
```

**5. `src/components/layout/NestoSidebar.tsx` - Footer vervangen (regels 265-301)**

Verwijder:
- Support & Documentatie sectie (regels 265-280) - verplaatst naar Settings sub-items
- Theme indicator footer (regels 282-301)
- `useTheme` import en `theme`/`resolvedTheme` destructuring
- `Sun`, `Moon`, `Monitor`, `HelpCircle`, `BookOpen` imports

Nieuwe footer:
```tsx
<div className="border-t border-border px-3 pt-3 pb-3 space-y-2">
  {/* Locatie */}
  <div className="flex items-center gap-2 px-2.5">
    <Building2 size={16} className="text-muted-foreground flex-shrink-0" />
    <span className="text-sm font-medium text-foreground truncate">Restaurant Demo</span>
  </div>
  {/* User */}
  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center flex-shrink-0">
      JD
    </div>
    <span className="text-sm text-foreground truncate flex-1">Jan de Vries</span>
    <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
  </div>
</div>
```

Toevoegen aan imports: `Building2` uit lucide-react.

### Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/lib/navigation.ts` | `section` veld toevoegen aan MenuItem + toewijzen, Support/Documentatie naar Settings sub-items |
| `src/components/layout/NestoSidebar.tsx` | Header iconen subtieler, search bar, section labels, nieuwe footer, imports opschonen |

