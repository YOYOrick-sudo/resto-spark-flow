
-- =============================================
-- MOLLIE CONNECT: Database Migration
-- =============================================

-- 1. Create mollie_connections table
CREATE TABLE public.mollie_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  mollie_organization_id TEXT,
  mollie_profile_id TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  onboarding_status TEXT NOT NULL DEFAULT 'pending',
  oauth_state TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id)
);

-- RLS
ALTER TABLE public.mollie_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own location mollie connections"
  ON public.mollie_connections FOR SELECT
  TO authenticated
  USING (location_id IN (
    SELECT l.id FROM locations l
    JOIN org_memberships om ON om.organization_id = l.organization_id
    WHERE om.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own location mollie connections"
  ON public.mollie_connections FOR ALL
  TO authenticated
  USING (location_id IN (
    SELECT l.id FROM locations l
    JOIN org_memberships om ON om.organization_id = l.organization_id
    WHERE om.user_id = auth.uid()
  ));

-- 2. Add payment columns to reservations
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS mollie_payment_id TEXT;

-- 3. Validation trigger for payment_status
CREATE OR REPLACE FUNCTION fn_validate_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status NOT IN ('none', 'pending', 'paid', 'expired', 'failed', 'canceled', 'refunded', 'partially_refunded') THEN
    RAISE EXCEPTION 'Invalid payment_status: %', NEW.payment_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_payment_status
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION fn_validate_payment_status();
