-- Sprint A.3 Ronde 1: Device + Personal Auth Foundation
-- =============================================================

-- 1. Extend location_role enum
ALTER TYPE location_role ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE location_role ADD VALUE IF NOT EXISTS 'employee';

-- 2. New enums
CREATE TYPE device_role_enum AS ENUM (
  'kitchen_station',
  'service_station',
  'bar_station',
  'reception_station'
);

CREATE TYPE actor_type_enum AS ENUM ('device', 'user', 'system');

CREATE TYPE audit_action_enum AS ENUM (
  'haccp.temperature_logged',
  'haccp.checklist_completed',
  'haccp.corrective_action',
  'invoice.approved',
  'invoice.rejected',
  'inventory.large_adjustment',
  'cash.reconciled',
  'transfer.recorded',
  'transfer.cancelled',
  'device.paired',
  'device.deactivated'
);

-- 3. devices table
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_role device_role_enum NOT NULL DEFAULT 'kitchen_station',
  status TEXT NOT NULL DEFAULT 'pending_activation',
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pairing_code TEXT,
  pairing_expires_at TIMESTAMPTZ,
  paired_at TIMESTAMPTZ,
  paired_by UUID REFERENCES auth.users(id),
  last_heartbeat TIMESTAMPTZ,
  app_version TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Validation trigger for devices.status
CREATE OR REPLACE FUNCTION validate_device_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status NOT IN ('pending_activation', 'active', 'inactive', 'blocked') THEN
    RAISE EXCEPTION 'Invalid device status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_device_status
  BEFORE INSERT OR UPDATE OF status ON devices
  FOR EACH ROW EXECUTE FUNCTION validate_device_status();

CREATE TRIGGER trg_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_devices_location_id ON devices(location_id);
CREATE INDEX idx_devices_auth_user_id ON devices(auth_user_id);
CREATE INDEX idx_devices_status ON devices(status);
CREATE UNIQUE INDEX idx_devices_pairing_code ON devices(pairing_code) WHERE pairing_code IS NOT NULL;

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- 4. staff_members table (NO pin_hash — explicit decision: no PINs in MVP)
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  role location_role NOT NULL DEFAULT 'service',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TRIGGER trg_staff_members_updated_at
  BEFORE UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_staff_members_org ON staff_members(organization_id);
CREATE INDEX idx_staff_members_location ON staff_members(location_id);

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- 5. audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  actor_type actor_type_enum NOT NULL,
  actor_id UUID,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  action audit_action_enum NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  recorded_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_audit_logs_recorded_at ON audit_logs USING BRIN(recorded_at);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_location ON audit_logs(location_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 6. stock_transfers table
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_location_id UUID NOT NULL REFERENCES locations(id),
  to_location_id UUID NOT NULL REFERENCES locations(id),
  bestelling_id UUID REFERENCES interne_bestellingen(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by_type actor_type_enum NOT NULL DEFAULT 'user',
  requested_by_id UUID,
  accepted_by UUID REFERENCES auth.users(id),
  notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CHECK (from_location_id != to_location_id)
);

CREATE OR REPLACE FUNCTION validate_transfer_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'accepted', 'in_transit', 'completed', 'rejected', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid transfer status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_transfer_status
  BEFORE INSERT OR UPDATE OF status ON stock_transfers
  FOR EACH ROW EXECUTE FUNCTION validate_transfer_status();

CREATE TRIGGER trg_stock_transfers_updated_at
  BEFORE UPDATE ON stock_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_stock_transfers_org ON stock_transfers(organization_id);
CREATE INDEX idx_stock_transfers_from ON stock_transfers(from_location_id);
CREATE INDEX idx_stock_transfers_to ON stock_transfers(to_location_id);

ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;

-- 7. transfer_items table
CREATE TABLE IF NOT EXISTS transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredienten(id) ON DELETE SET NULL,
  recept_id UUID REFERENCES recepten(id) ON DELETE SET NULL,
  product_naam TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  eenheid TEXT NOT NULL,
  received_quantity DECIMAL(10,3),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_transfer_items_transfer ON transfer_items(transfer_id);

ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;

-- 8. Custom Access Token Hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims             jsonb;
  user_platform_role text;
  user_org_id        uuid;
  user_roles         jsonb;
  device_id_val      uuid;
  device_location_id uuid;
  device_org_id      uuid;
  device_role_val    text;
BEGIN
  claims := event->'claims';

  -- Device check first (single SELECT INTO, 4 variables)
  SELECT d.id, d.location_id, l.organization_id, d.device_role::text
  INTO device_id_val, device_location_id, device_org_id, device_role_val
  FROM devices d
  JOIN locations l ON l.id = d.location_id
  WHERE d.auth_user_id = (event->>'user_id')::uuid
    AND d.status = 'active'
  LIMIT 1;

  IF FOUND THEN
    -- Device path
    claims := jsonb_set(claims, '{actor_type}', '"device"');
    claims := jsonb_set(claims, '{device_id}', to_jsonb(device_id_val::text));
    claims := jsonb_set(claims, '{location_id}', to_jsonb(device_location_id::text));
    claims := jsonb_set(claims, '{org_id}', to_jsonb(device_org_id::text));
    claims := jsonb_set(claims, '{device_role}', to_jsonb(device_role_val));
  ELSE
    -- User path: org_id via locations join (user_location_roles has no organization_id column)
    SELECT DISTINCT l.organization_id INTO user_org_id
    FROM user_location_roles ulr
    JOIN locations l ON l.id = ulr.location_id
    WHERE ulr.user_id = (event->>'user_id')::uuid
    LIMIT 1;

    -- Roles per location as JSON array
    SELECT jsonb_agg(jsonb_build_object(
      'location_id', ulr.location_id::text,
      'role', ulr.role::text
    ))
    INTO user_roles
    FROM user_location_roles ulr
    WHERE ulr.user_id = (event->>'user_id')::uuid;

    -- Platform role from profiles
    SELECT platform_role::text INTO user_platform_role
    FROM profiles
    WHERE id = (event->>'user_id')::uuid;

    claims := jsonb_set(claims, '{actor_type}', '"user"');
    claims := jsonb_set(claims, '{org_id}', to_jsonb(COALESCE(user_org_id::text, '')));
    claims := jsonb_set(claims, '{roles}', COALESCE(user_roles, '[]'::jsonb));

    IF user_platform_role IS NOT NULL THEN
      claims := jsonb_set(claims, '{platform_role}', to_jsonb(user_platform_role));
    END IF;
  END IF;

  RETURN jsonb_build_object('claims', claims);
END;
$$;

-- 9. Grants for supabase_auth_admin (hook needs SELECT access)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON public.devices TO supabase_auth_admin;
GRANT SELECT ON public.locations TO supabase_auth_admin;
GRANT SELECT ON public.user_location_roles TO supabase_auth_admin;
GRANT SELECT ON public.profiles TO supabase_auth_admin;

-- Prevent direct calls from app users
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;