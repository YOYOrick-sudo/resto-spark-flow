

## Sprint C2d — Bouwplan (definitief, met blokkerende rename-conflict)

### Stap 1 — Type & helper

**`src/hooks/useChecklistTemplates.ts`** — voeg toe aan `ChecklistItem`:
```ts
sectie?: string;  // undefined = "Algemeen"
```

**`src/lib/sectieGroup.ts`** (nieuw):
```ts
export const DEFAULT_SECTIE = "Algemeen";

export interface SectieGroep {
  naam: string;
  items: ChecklistItem[];
}

export function groupItemsBySectie(items: ChecklistItem[]): SectieGroep[] {
  const order: string[] = [];
  const map = new Map<string, ChecklistItem[]>();
  for (const it of [...items].sort((a, b) => a.volgorde - b.volgorde)) {
    const naam = it.sectie?.trim() || DEFAULT_SECTIE;
    if (!map.has(naam)) { map.set(naam, []); order.push(naam); }
    map.get(naam)!.push(it);
  }
  return order.map((naam) => ({ naam, items: map.get(naam)! }));
}
```

### Stap 2 — Run-pagina rendering (`TakenRun.tsx`)

- Nieuwe component **`src/components/taken/SectieGroup.tsx`** (presentatie):
  - Props: `naam`, `done`, `total`, `children`
  - Lokale state `manuallyExpanded: boolean | null` (null = auto)
  - Auto-collapse als `done === total && total > 0 && manuallyExpanded !== true`
  - Header: klikbaar, toont `{NAAM} ({done}/{total})` of `✓ {naam} — klaar` (success-kleur, sm font, uppercase tracking)
  - Smooth transitie via shadcn `Collapsible` (al beschikbaar)
- In `TakenRun.tsx`:
  - Vervang flat `items.map(...)` door `groupItemsBySectie(items).map(group => <SectieGroup>...</SectieGroup>)`
  - Render-functie per item extraheren naar `renderItem(item)` om in beide modi (check/temp) te hergebruiken
  - Sectie-headers krijgen `border-t border-border/40` als visuele scheiding (eerste sectie geen border)
  - Footer-progress (globaal done/total) blijft ongewijzigd

### Stap 3 — Editor: per-sectie groepering (`TemplatesTab.tsx`)

- Helper-state in `TemplateEditor`: groepen afgeleid via `useMemo(() => groupItemsBySectie(items), [items])`
- Items-blok herstructureren: één `DndContext` over alle secties, **per sectie** een eigen `SortableContext` met die items
- Boven de items-lijst: knop **`+ Sectie toevoegen`** → toont kleine inline input → bij Enter: voeg leeg item toe met `sectie = nieuweNaam`
- Per sectie-blok:
  - **Sectie-header rij** (boven sortable-list): inline-editable `<input>` voor sectie-naam, kleine delete-knop (`Trash2`, hover-only)
  - Header alleen als `naam !== DEFAULT_SECTIE` óf als er meerdere secties zijn
- **Rename-flow met conflict-blokkade**:
  - Lokale state `editingNaam` per sectie + `error: string | null`
  - Op blur/Enter: check of nieuwe naam (case-insensitive trim) al bestaat in andere secties van dit template
  - Conflict → toon inline `<p class="text-xs text-error">Sectie '{naam}' bestaat al</p>` onder input, revert naar oude naam in state na korte delay (~2s) of bij focus elders
  - Geen toast, geen merge
  - Geen conflict → bulk-update alle items met die oude `sectie` → nieuwe naam, `saveNow({ items: next })`
- **Sectie verwijderen**: alle items in die sectie krijgen `sectie = undefined` (vallen onder Algemeen), `saveNow`
- **Cross-section drag-and-drop**:
  - Verwijder `restrictToParentElement` modifier (alleen `restrictToVerticalAxis` blijft)
  - In `handleDragEnd`: vind `over`-item, lees `over.sectie`, zet `active.sectie = over.sectie`, herbereken volgorde
  - Items binnen `volgorde` bepalen sectie-volgorde automatisch (eerste verschijning)

### Stap 4 — Verificatie

- Manuele test: voeg sectie toe → items verschijnen onder header → versleep item naar andere sectie → controleer dat `sectie`-veld update in DB → run-pagina toont gegroepeerd
- Edge case: rename "MEP-kant" naar "Spoelkeuken" (bestaand) → blokkade + inline error
- Edge case: vink alle items in sectie af → auto-collapse na 300ms → klik header → expand voor review

### Stap 5 — Screenshots (browser)

1. Editor: template met sectie-headers + items
2. Editor: cross-section drag (voor + na = 2 screenshots)
3. Run: tijdlijn met sectie-progress `(2/5)`
4. Run: auto-collapsed sectie `✓ MEP-kant — klaar`
5. Run: collapsed sectie uitgeklapt na klik

### Wijzigende/nieuwe bestanden

| Bestand | Type | Wijziging |
|---|---|---|
| `src/hooks/useChecklistTemplates.ts` | edit | `sectie?: string` op `ChecklistItem` |
| `src/lib/sectieGroup.ts` | **nieuw** | `groupItemsBySectie()` + `DEFAULT_SECTIE` |
| `src/components/taken/SectieGroup.tsx` | **nieuw** | Sectie-blok met auto-collapse voor run-pagina |
| `src/components/taken/TemplatesTab.tsx` | edit | Per-sectie groepering, +Sectie knop, rename met conflict-check, cross-section DnD |
| `src/pages/TakenRun.tsx` | edit | Sectie-rendering via `SectieGroup` |

### Buiten scope (bevestigd)

- Drag van hele secties (volgorde via items)
- Secties in archivering/export
- Per_item modus + secties expliciet getest (werkt orthogonaal, niet apart gevalideerd)

