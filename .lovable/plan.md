

# Plan: Ingrediënten pagina — Keuken module

## Overzicht

De bestaande mock-based `Ingredienten.tsx` wordt volledig herschreven naar een data-driven pagina met Supabase queries, detail sidebar (NestoPanel), en CRUD operaties. Het volgt exact het patroon van de reserveringen-module.

## Bestanden

| Bestand | Actie |
|---|---|
| `src/hooks/useIngredienten.ts` | Nieuw — query hook: haalt ingrediënten + allergenen op |
| `src/hooks/useIngredient.ts` | Nieuw — single ingredient query met allergenen + bewegingen |
| `src/hooks/useIngredientMutations.ts` | Nieuw — create, update, archive, voorraad correctie, allergenen upsert |
| `src/pages/Ingredienten.tsx` | Herschrijven — verwijder mock data, gebruik hooks, voeg sidebar + filters toe |
| `src/components/ingredienten/IngredientDetailPanel.tsx` | Nieuw — NestoPanel met 5 tabs |
| `src/components/ingredienten/NieuwIngredientModal.tsx` | Nieuw — aanmaak modal |
| `src/components/ingredienten/tabs/AlgemeenTab.tsx` | Nieuw |
| `src/components/ingredienten/tabs/VoorraadTab.tsx` | Nieuw — incl. correctie modal + bewegingen historie |
| `src/components/ingredienten/tabs/KostprijsTab.tsx` | Nieuw |
| `src/components/ingredienten/tabs/LeveranciersTab.tsx` | Nieuw — placeholder |
| `src/components/ingredienten/tabs/AllergenenTab.tsx` | Nieuw — 2×7 grid met dropdowns |

## Technische details

### 1. Data hooks

**`useIngredienten(locationId, filters)`**
- Query `ingredienten` met `is_archived` filter
- Nested select: `ingredient_allergenen(*, allergenen(*))`
- Client-side search + categorie/status filtering
- Returns `{ data, isLoading, error }`

**`useIngredient(id)`**
- Single ingredient + allergenen + laatste 20 voorraad_bewegingen (met `profiles(full_name)` join)

**`useIngredientMutations()`**
- `createIngredient` — insert + bulk insert 14 `ingredient_allergenen` met status `onbekend`
- `updateIngredient` — partial update
- `archiveIngredient` — set `is_archived = true, archived_at = now()`
- `correctVoorraad` — insert `voorraad_bewegingen` (type CORRECTIE) + update `ingredienten.voorraad`
- `updateKostprijs` — update kostprijs + bron + timestamp
- `upsertAllergeenStatus` — upsert single `ingredient_allergenen` row

### 2. Overzichtspagina

Filters boven de tabel (niet sidebar — past beter bij de data):
- SearchBar (fuzzy op naam)
- Categorie dropdown (NestoSelect)
- Voorraad status dropdown
- "Toon gearchiveerd" toggle (Switch)

Tabel kolommen: Naam, Categorie, Eenheid, Kostprijs (+ bron badge), Voorraad (+ status badge), Allergenen (pills)

Voorraad status logica:
- `voorraad < min_voorraad` → rode "Laag"
- `min_voorraad ≤ voorraad < min_voorraad × 2` → groene "Op voorraad"
- `voorraad ≥ min_voorraad × 2` → blauwe "Overschot"
- `min_voorraad = 0` → altijd groen

Row click → open `IngredientDetailPanel`

### 3. Detail sidebar (NestoPanel)

5 tabs via `Tabs/TabsList/TabsTrigger/TabsContent`:

- **Algemeen**: editable velden, archiveer knop
- **Voorraad**: huidige voorraad display, min/max edit, correctie modal, bewegingen tabel
- **Kostprijs**: prijs display, inline edit, effectieve kostprijs met yield
- **Leveranciers**: placeholder tekst
- **Allergenen**: 2-koloms grid, 14 allergenen uit DB, dropdown per stuk, direct save

### 4. Nieuw ingrediënt modal

NestoModal met: naam, categorie, eenheid, yield, opslag type, opslag locatie.
Na save: auto-open detail panel op het nieuwe record.

### 5. Allergenen reference query

Eenmalig ophalen van de 14 allergenen uit de `allergenen` tabel (globale reference), gesorteerd op `sort_order`. Gebruikt in zowel de tabel pills als de allergenen tab.

