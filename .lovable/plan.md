

# Drie fixes op de ingrediënten code

## Wijzigingen

| # | Bestand | Wat |
|---|---|---|
| 1 | `src/hooks/useIngredient.ts` | `profiles:created_by(full_name)` → `profiles:medewerker_id(full_name)` |
| 2 | `src/hooks/useIngredienten.ts` | `.eq("location_id", locationId)` toevoegen aan de query |
| 3 | `src/hooks/useIngredientMutations.ts` | SELECT+INSERT/UPDATE vervangen door enkele `.upsert()` call met `onConflict` |

## Technische details

**Fix 1** — Regel 51 in `useIngredient.ts`: de foreign-key join verwijst naar `created_by` maar de kolom heet `medewerker_id`.

**Fix 2** — In `useIngredienten.ts`, na de `.order()` call en voor de archive-filter, toevoegen: `query = query.eq("location_id", locationId)`. De `locationId` variabele is al beschikbaar via `useUserContext`.

**Fix 3** — In `useIngredientMutations.ts`, de `upsertAllergeenStatus` mutationFn wordt vereenvoudigd van ~15 regels (maybeSingle + if/else) naar een enkele `supabase.from("ingredient_allergenen").upsert({...}, { onConflict: "ingredient_id,allergeen_id" })` call.

