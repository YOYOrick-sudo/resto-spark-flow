

# MEP: Verwijder prioriteitsview, voeg prio-badges toe aan categorieview

## Wat verandert

1. **Prioriteitsview verwijderen** — de "lijst" knop (List icon) verdwijnt uit de view-switcher. Alleen categorie (LayoutGrid) en week (CalendarDays) blijven over. Default view wordt `"categorie"`.

2. **Priority badges + dropdown in categorieview** — `MepCategoryView` en `MepCategoryGroup` krijgen een `onPriorityChange` prop, die wordt doorgegeven aan `MepTaskRow`. Daarmee wordt de bestaande priority-dropdown (Hoog/Normaal/Laag popover) actief in de categorieview. Prioriteit-badges worden subtiel getoond: alleen "Hoog" (rode NestoBadge) en "Laag" (grijze NestoBadge); "Normaal" toont alleen `···` bij hover.

3. **Week view dag-klik** gaat naar `"categorie"` in plaats van `"prioriteit"`.

## Technische wijzigingen

### `src/pages/MepTaken.tsx`
- `ViewMode` type: `"categorie" | "week"` (verwijder `"prioriteit"`)
- `getInitialView()` default: `"categorie"`, filter out `"prioriteit"` uit localStorage
- Verwijder `MepPriorityView` import en `useMepIngredientStock` import
- Verwijder `ingredientStock` / `stockMap` logica
- View-switcher: verwijder de `List` knop, houd `LayoutGrid` + `CalendarDays`
- Week view `onSelectDate`: `setView("categorie")`
- Categorie view: geef `onPriorityChange={handlePriorityChange}` door
- Verwijder `view === "prioriteit"` branch — altijd `MepCategoryView` renderen in dag-modus
- Verwijder `List` uit lucide imports

### `src/components/mep/MepCategoryView.tsx`
- Voeg `onPriorityChange` prop toe aan interface
- Geef door aan `MepCategoryGroup` en `MepOvertijdGroup`

### `src/components/mep/MepCategoryGroup.tsx`
- Voeg `onPriorityChange` prop toe
- Geef door aan `MepTaskRow`

### `src/components/mep/MepOvertijdGroup.tsx`
- Voeg `onPriorityChange` prop toe (als dat nog niet het geval is)
- Geef door aan `MepTaskRow`

Geen database wijzigingen. De priority popover in `MepTaskRow` werkt al — het enige wat nodig is, is dat `onPriorityChange` wordt doorgegeven vanuit de categorieview.

