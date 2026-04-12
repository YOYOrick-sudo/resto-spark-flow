

# Fix: Kitchen rol toevoegen aan voorraad_bewegingen INSERT policy

## Wijziging

Eén regel aanpassen in de migratie — regel 289:

```sql
-- Was:
ARRAY['owner','manager']::public.location_role[]

-- Wordt:
ARRAY['owner','manager','kitchen']::public.location_role[]
```

Dit betreft alleen de `voorraad_bewegingen_insert` policy. Alle andere policies blijven ongewijzigd.

## Bestand

| Bestand | Actie |
|---|---|
| `supabase/migrations/20260412203907_be6cca1c-58be-4ffe-9112-ecc5027c3919.sql` | Regel 289: `kitchen` rol toevoegen aan INSERT policy |

