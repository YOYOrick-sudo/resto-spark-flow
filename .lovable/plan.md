

# Fix: ON CONFLICT werkt niet met partiële unique index

## Probleem

De unique index `idx_customers_location_phone` is partieel:
```sql
CREATE UNIQUE INDEX idx_customers_location_phone 
ON public.customers (location_id, phone_number) 
WHERE (phone_number IS NOT NULL)
```

PostgreSQL's `ON CONFLICT` vereist een exacte match met de constraint — inclusief de WHERE-clausule. Supabase JS `.upsert({ onConflict: 'location_id,phone_number' })` kan geen partiële index matchen, dus krijg je de fout "no unique or exclusion constraint matching the ON CONFLICT specification".

## Oplossing

**Database migratie**: Vervang de partiële index door een echte unique constraint (zonder WHERE-clausule). Null-waarden in `phone_number` conflicteren sowieso niet in een unique constraint (SQL standaard: NULL ≠ NULL), dus het gedrag is functioneel identiek.

```sql
DROP INDEX IF EXISTS idx_customers_location_phone;
ALTER TABLE public.customers 
  ADD CONSTRAINT uq_customers_location_phone UNIQUE (location_id, phone_number);
```

**Code**: Geen wijzigingen nodig. De `.upsert({ onConflict: 'location_id,phone_number' })` in alle drie de bestanden werkt dan correct.

## Bestanden

| Bestand | Actie |
|---|---|
| Migratie | Drop partiële index, maak echte unique constraint |

