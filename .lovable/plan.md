

# Fix: Ingrediënt detail — slide-over → volledige pagina

## Wijzigingen

### 1. `src/App.tsx`
- Toevoegen: `<Route path="/voorraad/:id" element={<IngredientenDetail />} />` tussen `/voorraad/nieuw` en `/voorraad`
- Lazy import voor `IngredientenDetail`

### 2. Nieuw: `src/pages/IngredientenDetail.tsx`
Volledige pagina, zelfde patroon als `ReceptenDetail.tsx`:

- `useParams()` voor `id`, `useIngredient(id)` voor data
- Loading → `<Spinner />`, error/not found → "Ingrediënt niet gevonden" + terug-link
- Back link: `← Ingrediënten` naar `/voorraad`
- Twee-kolom layout `grid-cols-5`:
  - **Links (col-span-3)**: `NestoTabs` + 5 tab contents (Algemeen, Voorraad, Kostprijs, Leveranciers, Allergenen) — importeer bestaande tab components
  - **Rechts (col-span-2, sticky)**: Naam (h2), categorie badge, eenheid, voorraad + status badge, kostprijs samenvatting, allergenen pills, archiveer button

### 3. `src/components/ingredienten/tabs/AlgemeenTab.tsx`
- Wijzig `onClose` prop naar optioneel
- Na archiveren: `navigate("/voorraad")` via `useNavigate()` in plaats van `onClose()`
- Verwijder `onClose` prop uit interface

### 4. `src/pages/Ingredienten.tsx`
- `onRowClick` → `navigate(/voorraad/${item.id})` 
- Verwijder `IngredientDetailPanel` import, `selectedId` state, en `<IngredientDetailPanel>` JSX

### 5. `src/components/ingredienten/IngredientDetailPanel.tsx`
- Kan verwijderd worden (niet meer gebruikt)

**Totaal: 1 nieuw bestand, 3 gewijzigd, 1 verwijderd, 0 migraties.**

