-- Fix 1: stock_transfers — instant recording (geen approval workflow)
CREATE OR REPLACE FUNCTION public.validate_transfer_status()
RETURNS trigger 
LANGUAGE plpgsql 
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('draft', 'recorded', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transfer status: %. Must be one of: draft, recorded, cancelled', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE public.stock_transfers ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.stock_transfers ALTER COLUMN status SET DEFAULT 'recorded';
ALTER TABLE public.stock_transfers DROP COLUMN IF EXISTS accepted_by;
ALTER TABLE public.stock_transfers DROP COLUMN IF EXISTS accepted_at;
ALTER TABLE public.stock_transfers DROP COLUMN IF EXISTS completed_at;

ALTER TABLE public.transfer_items DROP COLUMN IF EXISTS received_quantity;

-- Fix 2: audit_logs — identificatie-kolommen voor HACCP "Wie ben je?" modal
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS actor_name TEXT,
  ADD COLUMN IF NOT EXISTS identified_by_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS identified_by_name TEXT,
  ADD COLUMN IF NOT EXISTS identification_method TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_identified_staff ON public.audit_logs(identified_by_staff_id);

-- Fix 3: staff_members.location_id nullable
ALTER TABLE public.staff_members ALTER COLUMN location_id DROP NOT NULL;
COMMENT ON COLUMN public.staff_members.location_id IS 'NULL = werkt op alle locaties binnen de organization';