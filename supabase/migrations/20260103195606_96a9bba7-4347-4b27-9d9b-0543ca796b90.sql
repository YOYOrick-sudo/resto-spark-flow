-- ============================================
-- FASE 4.1: SECURITY DEFINER FUNCTIONS
-- ============================================

-- ===================
-- PLATFORM ROLE CHECKS (GLOBAL, NOT PER ORG)
-- ===================

-- Check if user is platform admin (reads from profiles, not org_memberships)
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id 
    AND platform_role = 'platform_admin'
  )
$$;

-- Check if user is any platform user (admin or support)
CREATE OR REPLACE FUNCTION public.is_platform_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id 
    AND platform_role IS NOT NULL
  )
$$;

-- ===================
-- ORGANIZATION & LOCATION ACCESS CHECKS
-- ===================

-- Check if user is member of organization (or platform user)
CREATE OR REPLACE FUNCTION public.user_in_organization(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_platform_user(_user_id) OR
    EXISTS (
      SELECT 1 FROM public.org_memberships
      WHERE user_id = _user_id AND organization_id = _org_id
    )
$$;

-- Check if user has access to location (has role or is platform user)
CREATE OR REPLACE FUNCTION public.user_has_location_access(_user_id UUID, _location_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_platform_user(_user_id) OR
    EXISTS (
      SELECT 1 FROM public.user_location_roles
      WHERE user_id = _user_id AND location_id = _location_id
    )
$$;

-- Get user's role for a specific location
CREATE OR REPLACE FUNCTION public.get_user_location_role(_user_id UUID, _location_id UUID)
RETURNS location_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_location_roles
  WHERE user_id = _user_id AND location_id = _location_id
$$;

-- Check if user has specific role in location
CREATE OR REPLACE FUNCTION public.user_has_role_in_location(_user_id UUID, _location_id UUID, _roles location_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_platform_admin(_user_id) OR
    EXISTS (
      SELECT 1 FROM public.user_location_roles
      WHERE user_id = _user_id 
      AND location_id = _location_id
      AND role = ANY(_roles)
    )
$$;

-- ===================
-- PERMISSIONS
-- ===================

-- Get all permissions for user in a location (with COALESCE for empty array)
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID, _location_id UUID)
RETURNS TEXT[]
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY_AGG(DISTINCT p.key),
    ARRAY[]::TEXT[]
  )
  FROM public.user_location_roles ulr
  JOIN public.role_permission_sets rps ON rps.role = ulr.role
  JOIN public.permission_set_permissions psp ON psp.permission_set_id = rps.permission_set_id
  JOIN public.permissions p ON p.id = psp.permission_id
  WHERE ulr.user_id = _user_id AND ulr.location_id = _location_id
$$;

-- Check if user has specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id UUID, _location_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_platform_admin(_user_id) OR
    _permission = ANY(public.get_user_permissions(_user_id, _location_id))
$$;

-- ===================
-- CENTRAL CONTEXT RESOLVER (THE ONE SOURCE OF TRUTH)
-- ===================

CREATE OR REPLACE FUNCTION public.get_user_context(_user_id UUID, _location_id UUID)
RETURNS JSON
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'user_id', _user_id,
    'location_id', _location_id,
    'organization_id', (SELECT organization_id FROM public.locations WHERE id = _location_id),
    'role', (SELECT role::TEXT FROM public.user_location_roles WHERE user_id = _user_id AND location_id = _location_id),
    'is_platform_admin', public.is_platform_admin(_user_id),
    'is_platform_user', public.is_platform_user(_user_id),
    'permissions', public.get_user_permissions(_user_id, _location_id),
    'entitlements', COALESCE(
      (SELECT json_agg(json_build_object('module', module_key::TEXT, 'enabled', enabled))
       FROM public.location_entitlements WHERE location_id = _location_id),
      '[]'::JSON
    )
  )
$$;

-- ===================
-- EMPLOYEE ACCESS CHECKS
-- ===================

-- Check if user is an employee at location
CREATE OR REPLACE FUNCTION public.is_employee_at_location(_user_id UUID, _location_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = _user_id AND location_id = _location_id
  )
$$;

-- Get employee ID for user at location
CREATE OR REPLACE FUNCTION public.get_employee_id(_user_id UUID, _location_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employees
  WHERE user_id = _user_id AND location_id = _location_id
  LIMIT 1
$$;