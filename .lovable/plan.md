

# Recepten & Halffabricaten Database

## Overzicht

Eén migratie die 4 tabellen aanmaakt, een allergenen-aggregatie trigger, RLS policies en indexes. Volgt exact het patroon van de ingrediënten-module.

## Tabellen

| Tabel | Beschrijving |
|---|---|
| `recepten` | Hoofdtabel voor recepten en halffabricaten (type kolom) |
| `recept_ingredienten` | Ingrediënten per recept met kostprijs/yield snapshots |
| `recept_allergenen` | Auto-berekende allergenen status per recept |
| `halffabricaat_methodes` | Bereidingsmethodes met output-eenheden en houdbaarheid |

## Migratie bevat

1. **4 CREATE TABLE statements** — exact zoals opgegeven, met validatie-triggers i.p.v. CHECK constraints (voor `type`, `status`, `methode type`)
2. **Trigger `recalculate_recept_allergenen()`** — AFTER INSERT/UPDATE/DELETE op `recept_ingredienten`, herberekent allergenen via worst-case aggregatie (bevat > kan_bevatten > onbekend > geen)
3. **`update_updated_at` trigger** op `recepten`
4. **RLS policies** per tabel:
   - `recepten`: direct `location_id` check (zelfde als ingrediënten)
   - `recept_ingredienten`, `recept_allergenen`, `halffabricaat_methodes`: via JOIN op `recepten.location_id`
   - SELECT: authenticated + location access
   - INSERT/UPDATE/DELETE: owner + manager rollen
5. **Indexes**: `recepten(location_id)`, `recepten(location_id, type)`, `recept_ingredienten(recept_id)`, `recept_ingredienten(ingredient_id)`, `halffabricaat_methodes(recept_id)`

## Technische details

- Validatie-triggers voor `recepten.type` (`halffabricaat`/`gerecht`) en `halffabricaat_methodes.type` (10 waarden) — geen CHECK constraints (Supabase restore-compatibel)
- `recept_ingredienten` heeft GEEN unique constraint op `(recept_id, ingredient_id)` — zelfde ingrediënt kan meerdere keren voorkomen met verschillende hoeveelheden
- `halffabricaat_methodes.sub_recept_id` is een self-referencing FK naar `recepten(id)` voor geneste bereidingen
- Allergenen trigger gebruikt `SECURITY DEFINER` om RLS te bypassen bij de DELETE+INSERT in `recept_allergenen`

