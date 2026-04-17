

## Status: al gedaan in vorige loops ✅

Alle drie de fixes zitten al in `src/components/taken/TemplatesTab.tsx` (505 regels). Hieronder per fix waar het zit:

### 1. Rechterkolom scrollbaar — regel 152
```tsx
<section className="h-[calc(100vh-220px)] overflow-y-auto pr-1">
```
Onafhankelijke scroll-container met sticky header (regel 281: `sticky top-0 z-10 ... bg-background/80 backdrop-blur-md`).

### 2. Compacte tabel-rijen — regel 412-501 (`SortableItemRow`)
Grid `[24px_1fr_140px_auto_28px]` op één regel:
- **24px** — drag handle (GripVertical, opacity-0 → group-hover:opacity-100)
- **1fr** — borderless titel-input (focus reveal border)
- **140px** — type-dropdown (NestoSelect)
- **auto** — vereist-toggle + temp min/max inline (alleen bij `type === "temperatuur"`)
- **28px** — delete (Trash2, hover-reveal)

Cards weg, divide-y rijen in één container (regel 351: `bg-card border border-border rounded-lg overflow-hidden divide-y divide-border`).

### 3. Drag-and-drop met dnd-kit — regel 217-262
- `PointerSensor` met `activationConstraint: { distance: 4 }`
- `DndContext` + `SortableContext` (verticalListSortingStrategy)
- Modifiers: `restrictToVerticalAxis` + `restrictToParentElement`
- `arrayMove` + automatische volgorde-renumber in `handleDragEnd`
- Geen pijltjes meer

## Wat ik nu doe

Niets te bouwen — code is compleet en consistent met `SortableShiftRow`-patroon. Geen file-edits.

**Gevraagd te doen door jou (kan ik niet zelf in plan-mode):**
1. Open `/taken` → tab Templates → kies een template met 6+ items (de seed "Opening keuken" heeft er 6)
2. Versleep een item via de GripVertical handle (verschijnt op hover) en sla op
3. Voeg ~10 items toe en check of de rechterkolom netjes scrollt terwijl de Annuleren/Opslaan-header sticky blijft

Als alles werkt → groen licht voor Sprint C1. Als er iets schuurt (bv. handle te smal op tablet, dropdown z-index issue) — meld het en ik fix gericht.

