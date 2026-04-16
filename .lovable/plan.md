

# Sprint A.3 Ronde 1 — Fixes (additive migratie)

## Context
Migratie 1 is al gedraaid. Drie correcties via additive ALTER, geen DROP TABLE.

## Verificatie state (gecheckt)
<lov-tool-use id="toolu_vrtx_01VeXr9NH2McxxJmPunDka1z" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('stock_transfers','audit_logs','staff_members','transfer_items') ORDER BY table_name, ordinal_position;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01KFNwgCzqVtfZhcFoWELvWf" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('stock_transfers','audit_logs','staff_members','transfer_items') ORDER BY table_name, ordinal_position;\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016UDzySGuoeArJbgBanJyYh" name="supabase--read_query" integration-id="supabase" data="{\"query\": \"SELECT proname, pg_get_functiondef(oid) FROM pg_proc WHERE proname IN ('validate_transfer_status','validate_device_status');\"}">
</lov-tool-use>
Schema bevestigd. Geen rijen in `stock_transfers` of `transfer_items` (tabellen net aangemaakt) — drop kolommen veilig. Plan klaar.

<lov-plan>

# Sprint A.3 Ronde 1 — 3 Fixes (Additive Migration)

## Geverifieerde state
- `stock_transfers.status` default: `'pending'`, trigger accepteert oude waardenset
- `stock_transfers` heeft kolommen: `accepted_by`, `accepted_at`, `completed_at`
- `transfer_items` heeft kolom: `received_quantity`
- `staff_members.location_id`: `NOT NULL`
- `audit_logs`: mist `actor_name`, `identified_by_staff_id`, `identified_by_name`, `identification_method`
- Tabellen zijn leeg → DROP COLUMN veilig, geen data-conversie nodig

## Fixes in één migratie

### Fix 1 — `stock_transfers`: instant recording (geen approval)
```sql
-- Update validation trigger first (anders breekt UPDATE van default)
CREATE OR REPLACE FUNCTION public.validate_transfer_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'recorded', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transfer status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE stock_transfers ALTER COLUMN status DROP DEFAULT;
ALTER TABLE stock_transfers ALTER COLUMN status SET DEFAULT 'recorded';
ALTER TABLE stock_transfers DROP COLUMN accepted_by;
ALTER TABLE stock_transfers DROP COLUMN accepted_at;
ALTER TABLE stock_transfers DROP COLUMN completed_at;

ALTER TABLE transfer_items DROP COLUMN received_quantity;
```

### Fix 2 — `audit_logs`: identificatie-kolommen
```sql
ALTER TABLE audit_logs
  ADD COLUMN actor_name TEXT,
  ADD COLUMN identified_by_staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  ADD COLUMN identified_by_name TEXT,
  ADD COLUMN identification_method TEXT;

CREATE INDEX idx_audit_logs_identified_staff ON audit_logs(identified_by_staff_id);
```

### Fix 3 — `staff_members.location_id` nullable
```sql
ALTER TABLE staff_members ALTER COLUMN location_id DROP NOT NULL;
COMMENT ON COLUMN staff_members.location_id IS 'NULL = werkt op alle locaties binnen de organization';
```

## Verificatie-queries (na migratie)

```sql
-- 1. stock_transfers structuur
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='stock_transfers'
ORDER BY ordinal_position;
-- Verwacht: geen accepted_by/accepted_at/completed_at, status default 'recorded'

-- 2. transfer_items structuur
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='transfer_items'
ORDER BY ordinal_position;
-- Verwacht: geen received_quantity

-- 3. audit_logs structuur
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='audit_logs'
ORDER BY ordinal_position;
-- Verwacht: actor_name, identified_by_staff_id, identified_by_name, identification_method aanwezig

-- 4. staff_members.location_id nullable
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_schema='public' AND table_name='staff_members' AND column_name='location_id';
-- Verwacht: YES

-- 5. trigger functie body
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='validate_transfer_status';
-- Verwacht: IN ('draft','recorded','cancelled')

-- 6. Trigger smoke test (rollback)
BEGIN;
INSERT INTO stock_transfers (organization_id, from_location_id, to_location_id, status, requested_by_type)
SELECT organization_id, id, id, 'recorded', 'user' FROM locations LIMIT 1;
-- Verwacht: CHECK from!=to faalt → bevestigt trigger werkt op nieuwe waarden
ROLLBACK;
```

## Bestanden

| Actie | Bestand |
|-------|---------|
| CREATE | `supabase/migrations/[timestamp]_a3_round1_fixes.sql` (additive ALTERs hierboven) |

Geen wijzigingen aan `pair-device/index.ts` of `config.toml` nodig — de Edge Function logt alleen `device.paired` en raakt geen van de gewijzigde kolommen.

## Memory update
Update `mem://architecture/device-auth-jwt-hook` met de nieuwe `stock_transfers` status-set (draft/recorded/cancelled — instant recording, geen approval flow).

