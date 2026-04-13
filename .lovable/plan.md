

# Fix migratie: validate_mep_tasks + auto_deplete_ingredients

## Wat wijzigt

Eén database migratie die twee trigger functies corrigeert:

### 1. `validate_mep_tasks()` — status 'skipped' → 'cancelled'
De valid statuses worden: `pending`, `in_progress`, `completed`, `cancelled`.

### 2. `auto_deplete_ingredients()` — correcte voorraad_bewegingen kolommen
De huidige trigger gebruikt kolomnamen die niet bestaan in `voorraad_bewegingen`. Bevestigd via schema-check:

| Huidig (fout) | Correct |
|---|---|
| `reden` | `bron` |
| `referentie_id::text` | `referentie_type` + `referentie_id` (UUID) |
| `uitgevoerd_door` | `medewerker_id` |
| `eenheid` kolom | bestaat niet, verwijderen |

De gecorrigeerde INSERT:
```sql
INSERT INTO public.voorraad_bewegingen (
  ingredient_id, type, hoeveelheid, bron, referentie_type, referentie_id, medewerker_id
) VALUES (
  r.ingredient_id, 'OUT',
  -(r.hoeveelheid * NEW.units_gemaakt / v_porties),
  'Productie', 'mep_task', NEW.task_id, NEW.medewerker_id
);
```

De `UPDATE ingredienten SET voorraad = ...` regel blijft ongewijzigd.

## Technische details

Eén SQL migratie met twee `CREATE OR REPLACE FUNCTION` statements. Geen tabel-wijzigingen nodig — alleen de trigger functies worden vervangen.

## Bestanden

| Bestand | Actie |
|---|---|
| `supabase/migrations/xxx.sql` | Nieuw — replace beide trigger functies |

