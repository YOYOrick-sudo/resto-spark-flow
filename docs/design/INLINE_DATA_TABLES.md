# INLINE DATA TABLES PATTERN
Laatst bijgewerkt: 9 januari 2026

## Wanneer Gebruiken

Dit pattern is ideaal voor:
- Lijsten van child-items binnen een parent context (areas → tafels, categorieën → gerechten)
- Situaties waar je items wilt kunnen herschikken via drag-and-drop
- Compacte weergave van meerdere datapunten per item

**Alternatieven overwegen:**
- Separate pagina: voor complexe items met veel details
- Modal met lijst: voor quick-select scenario's
- Geneste cards: vermijden - te veel visuele ruis

---

## Anatomie

```
┌─────────────────────────────────────────────────────────────┐
│ ≡ ▼ Parent Naam   4 items · 24 summary   [Select ▼]    ⋮   │  ← Parent Header
├─────────────────────────────────────────────────────────────┤
│    Naam          Col 2      Col 3   Col 4                   │  ← Child Header Row
│    ─────────────────────────────────────────────────────    │
│ ≡  Item 1        value      ●       badge              ⋮   │  ← Child Data Row
│ ≡  Item 2        value      ○       —                  ⋮   │
│ ≡  Item 3        value      ●       badge              ⋮   │
│                                                             │
│    [+ Item]  [+ Meerdere]                                   │  ← Footer Actions
└─────────────────────────────────────────────────────────────┘
```

---

## Grid Layout Specificaties

### Standaard 6-koloms Layout

| Kolom | Breedte | Inhoud | Voorbeeld |
|-------|---------|--------|-----------|
| Drag handle | 32px | `GripVertical` icon | ≡ |
| Primary identifier | 1fr | Naam, label | "Tafel 1" |
| Metadata 1 | 80px | Capacity, prijs, etc. | "2-4 pers" |
| Status indicator | 40px | `StatusDot` | ● of ○ |
| Metadata 2 | 80px | Count badge, category | Badge of "—" |
| Actions | 32px | `DropdownMenu` trigger | ⋮ |

### Tailwind Classes

```tsx
// Data row
className="grid grid-cols-[32px_1fr_80px_40px_80px_32px] items-center gap-2 py-2 px-1 rounded-lg hover:bg-muted/50 transition-colors group"

// Header row (zelfde grid, andere styling)
className="grid grid-cols-[32px_1fr_80px_40px_80px_32px] gap-2 text-xs text-muted-foreground px-1 pb-2 border-b border-border/50 mb-1"
```

### Variaties

**5-koloms (zonder status):**
```tsx
grid-cols-[32px_1fr_80px_80px_32px]
```

**4-koloms (minimaal):**
```tsx
grid-cols-[32px_1fr_80px_32px]
```

---

## Parent Header Summary

### Ingeklapt (Collapsed)
Toon uitgebreide summary voor snelle scan:
```
▶ Restaurant   4 tafels · 24 personen   [Prioriteit ▼]   ⋮
```

### Uitgeklapt (Expanded)
Korter formaat, details zichtbaar in tabel:
```
▼ Restaurant   (4 tafels)   [Prioriteit ▼]   ⋮
```

### Implementatie
```tsx
{isExpanded ? (
  <span className="text-sm text-muted-foreground">
    ({activeItems.length} {itemLabel})
  </span>
) : (
  <span className="text-sm text-muted-foreground">
    {activeItems.length} {itemLabel} · {totalCapacity} {summaryUnit}
  </span>
)}
```

---

## Styling Specificaties

### Row Styling

```tsx
// Base row
className="py-2 px-1 rounded-lg transition-colors"

// Hover state
className="hover:bg-muted/50"

// Group-based action visibility
className="group" // op de row
className="opacity-0 group-hover:opacity-100 transition-opacity" // op actions
```

### Header Row

```tsx
className="grid grid-cols-[...] gap-2 text-xs text-muted-foreground px-1 pb-2 border-b border-border/50 mb-1"
```

### StatusDot Gebruik

| Status | Kleur | Wanneer |
|--------|-------|---------|
| `success` | Groen (●) | Actief, online, enabled |
| `neutral` | Grijs (○) | Inactief, offline, disabled |
| `warning` | Oranje | Aandacht nodig |
| `error` | Rood | Fout, probleem |

```tsx
<StatusDot 
  status={item.is_active ? "success" : "neutral"} 
  size="md"
/>
```

### Badge voor Counts

```tsx
{count > 0 ? (
  <NestoBadge variant="default" className="text-xs px-2 py-0.5">
    {count}
  </NestoBadge>
) : (
  <span className="text-xs text-muted-foreground">—</span>
)}
```

---

## Drag-and-Drop

### Sensors Configuratie
```tsx
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);
```

### Handle-Only Dragging
```tsx
<button
  {...attributes}
  {...listeners}
  className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
>
  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
</button>
```

### Notion-Style Overlay
- Originele item: `opacity: 0` + `visibility: hidden` tijdens drag
- Overlay: Minimale styling, geen interactieve elementen

```tsx
// In SortableRow
const style: React.CSSProperties = {
  transform: CSS.Transform.toString(transform),
  transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
  opacity: isDragging ? 0 : 1,
  visibility: isDragging ? 'hidden' : 'visible',
};

// DragOverlay
<DragOverlay>
  {activeId && <MinimalOverlayComponent item={activeItem} />}
</DragOverlay>
```

---

## Gecentraliseerde Archived Sectie

### Principe
- **Verwijder** geneste "Gearchiveerd" collapsibles binnen elke parent
- **Voeg toe** één gecentraliseerde sectie onderaan de parent lijst

### Structuur
```
▶ Gearchiveerd (3 areas, 4 tafels)
  └─ Gearchiveerde areas
     └─ Bar (3 tafels)                    [Herstellen]
     └─ Oude terras (5 tafels)            [Herstellen]
  
  └─ Gearchiveerde tafels
     └─ Tafel 5 (was in: Restaurant)      [Herstellen]
     └─ Tafel 8 (was in: Restaurant)      [Herstellen]
```

### Voordelen
- Minder geneste UI
- Overzicht van alle archived items op één plek
- Eenvoudiger restore flow

---

## Voorbeelden per Module

| Module | Parent | Children | Kolommen |
|--------|--------|----------|----------|
| Reserveringen | Areas | Tafels | Naam, Capacity, Online, Groepen |
| Kaartbeheer | Categorieën | Gerechten | Naam, Prijs, Actief, Allergenen |
| Keuken | Recepten | Ingrediënten | Naam, Hoeveelheid, Eenheid, Prijs |
| Taken | Takenlijsten | Taken | Naam, Deadline, Status, Assignee |
| Inkoop | Leveranciers | Producten | Naam, Prijs, Voorraad, Besteld |

---

## Component Referenties

| Component | Locatie | Rol |
|-----------|---------|-----|
| `SortableTableRow` | `src/components/settings/tables/SortableTableRow.tsx` | Voorbeeld child row |
| `AreaCard` | `src/components/settings/tables/AreaCard.tsx` | Voorbeeld parent container |
| `AreasSection` | `src/components/settings/tables/AreasSection.tsx` | Voorbeeld archived sectie |
| `StatusDot` | `src/components/polar/StatusDot.tsx` | Status indicator |
| `NestoBadge` | `src/components/polar/NestoBadge.tsx` | Count badge |
| `NestoCard` | `src/components/polar/NestoCard.tsx` | Parent container |

---

## Checklist voor Nieuwe Modules

- [ ] Gebruik `NestoCard` met `Collapsible` voor parent container
- [ ] Implementeer grid layout met vaste kolommen (32px-1fr-80px-40px-80px-32px)
- [ ] Voeg header row toe met kolom labels (text-xs, muted)
- [ ] Gebruik `StatusDot` voor boolean status indicators
- [ ] Gebruik `NestoBadge` voor count values, "—" voor 0
- [ ] Implementeer hover-reveal actions met `group` + `opacity` pattern
- [ ] Voeg parent summary toe (collapsed: uitgebreid, expanded: kort)
- [ ] Handle-only drag-and-drop met `GripVertical`
- [ ] Verplaats archived items naar gecentraliseerde sectie onderaan
- [ ] Notion-style drag overlay (origineel verborgen)

---

## Gerelateerde Documentatie

- [BORDER_RADIUS.md](./BORDER_RADIUS.md) - Border radius tokens
- [COLOR_PALETTE.md](./COLOR_PALETTE.md) - Kleur tokens
- [SIDEBAR_PANELS.md](./SIDEBAR_PANELS.md) - Sidebar patterns

---

## Lege Waarden Standaard

**Regel:** Lege waarden in tabellen worden leeg gelaten — geen "Geen", "N/A", of placeholder badges. Minder visuele ruis = beter scanbaar.

- ✅ Lege cel bij geen allergenen
- ✅ Lege cel bij geen notities
- ❌ `NestoBadge variant="outline"` met tekst "Geen"
- ❌ Tekst "N/A" of "—" voor optionele velden
