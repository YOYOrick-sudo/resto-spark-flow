

# Plan: Ingrediënten fundament — Database Ronde 1

Eén database migratie die alle 5 tabellen, seed data, RLS policies, triggers en indexes aanmaakt.

## Wat er wordt gebouwd

### 1. `allergenen` reference tabel + seed
- 14 EU allergenen met `code`, `naam_nl`, `naam_en`, `sort_order`
- Geen `location_id` — globale reference tabel
- RLS: SELECT voor alle authenticated users, geen INSERT/UPDATE/DELETE

### 2. `ingredienten` tabel
- Alle kolommen zoals gespecificeerd (naam, categorie, eenheid, kostprijs, yield, voorraad, opslag, archivering)
- `UNIQUE(location_id, naam)`
- `updated_at` trigger

### 3. `ingredient_allergenen` koppeltabel
- Status: `bevat`, `kan_bevatten`, `geen`, `onbekend` (geen "sporen")
- `UNIQUE(ingredient_id, allergeen_id)`

### 4. `eenheid_conversies` tabel
- Per ingredient custom conversies (kg→g, L→ml, etc.)
- `UNIQUE(ingredient_id, van_eenheid, naar_eenheid)`

### 5. `voorraad_bewegingen` tabel
- Types: `IN`, `OUT`, `CORRECTIE`, `WASTE`, `TRANSFER`
- `medewerker_id` references `profiles(id)`

### 6. RLS policies
Patroon per tabel:

| Tabel | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| `allergenen` | Alle authenticated users | Geen (seed only) |
| `ingredienten` | Via `(SELECT auth.uid())` subquery op `user_location_roles` | owner/manager via `user_has_role_in_location` |
| `ingredient_allergenen` | JOIN op `ingredienten.location_id` | idem |
| `eenheid_conversies` | JOIN op `ingredienten.location_id` | idem |
| `voorraad_bewegingen` | JOIN op `ingredienten.location_id` | idem |

### 7. Indexes
- `ingredienten(location_id)`
- `ingredienten(location_id, categorie)`
- `voorraad_bewegingen(ingredient_id)`
- `voorraad_bewegingen(created_at DESC)`

## Technische details

Eén SQL migratie via de database migration tool. Geen code-wijzigingen in deze ronde — puur schema.

## Bestanden

| Bestand | Actie |
|---|---|
| `supabase/migrations/[timestamp].sql` | Nieuwe migratie met alle 5 tabellen, seed, RLS, triggers, indexes |

