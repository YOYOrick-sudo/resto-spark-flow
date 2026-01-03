-- ============================================
-- FASE 4.1: RLS POLICIES (COMPLETE)
-- ============================================

-- ===================
-- ENABLE RLS ON ALL TABLES
-- ===================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_location_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_set_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permission_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- ===================
-- PROFILES POLICIES
-- ===================

-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Platform users can view all profiles
CREATE POLICY "profiles_select_platform" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_platform_user(auth.uid()));

-- Users can update their own profile (but not platform_role)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND (platform_role IS NULL OR platform_role = (SELECT platform_role FROM public.profiles WHERE id = auth.uid())));

-- Platform admins can manage all profiles
CREATE POLICY "profiles_all_admin" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- ===================
-- ORGANIZATIONS POLICIES
-- ===================

-- Platform users can view all organizations (read-only)
CREATE POLICY "organizations_select_platform" ON public.organizations
  FOR SELECT TO authenticated
  USING (public.is_platform_user(auth.uid()));

-- Org members can view their own organization
CREATE POLICY "organizations_select_member" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships 
      WHERE user_id = auth.uid() AND organization_id = organizations.id
    )
  );

-- Platform admins can insert/update/delete organizations
CREATE POLICY "organizations_insert_admin" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "organizations_update_admin" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "organizations_delete_admin" ON public.organizations
  FOR DELETE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- ===================
-- LOCATIONS POLICIES
-- ===================

-- Platform users can view all locations
CREATE POLICY "locations_select_platform" ON public.locations
  FOR SELECT TO authenticated
  USING (public.is_platform_user(auth.uid()));

-- Org members can view locations in their organization
CREATE POLICY "locations_select_member" ON public.locations
  FOR SELECT TO authenticated
  USING (public.user_in_organization(auth.uid(), organization_id));

-- Platform admins can insert locations
CREATE POLICY "locations_insert_admin" ON public.locations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Owners can insert locations in their org
CREATE POLICY "locations_insert_owner" ON public.locations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_location_roles ulr
      JOIN public.locations l ON l.organization_id = locations.organization_id
      WHERE ulr.user_id = auth.uid() AND ulr.role = 'owner'
    )
  );

-- Platform admins and location owners/managers can update
CREATE POLICY "locations_update" ON public.locations
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin(auth.uid()) OR
    public.user_has_role_in_location(auth.uid(), id, ARRAY['owner', 'manager']::location_role[])
  );

-- Platform admins can delete locations
CREATE POLICY "locations_delete_admin" ON public.locations
  FOR DELETE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- ===================
-- ORG_MEMBERSHIPS POLICIES
-- ===================

-- Platform users can view all memberships
CREATE POLICY "org_memberships_select_platform" ON public.org_memberships
  FOR SELECT TO authenticated
  USING (public.is_platform_user(auth.uid()));

-- Users can view their own memberships
CREATE POLICY "org_memberships_select_own" ON public.org_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Org members can view memberships in their organization
CREATE POLICY "org_memberships_select_org" ON public.org_memberships
  FOR SELECT TO authenticated
  USING (public.user_in_organization(auth.uid(), organization_id));

-- Platform admins can manage memberships
CREATE POLICY "org_memberships_all_admin" ON public.org_memberships
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Org owners can manage memberships (must have owner role in any location of that org)
CREATE POLICY "org_memberships_insert_owner" ON public.org_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_location_roles ulr
      JOIN public.locations l ON l.id = ulr.location_id
      WHERE ulr.user_id = auth.uid() 
      AND l.organization_id = org_memberships.organization_id 
      AND ulr.role = 'owner'
    )
  );

CREATE POLICY "org_memberships_delete_owner" ON public.org_memberships
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_location_roles ulr
      JOIN public.locations l ON l.id = ulr.location_id
      WHERE ulr.user_id = auth.uid() 
      AND l.organization_id = org_memberships.organization_id 
      AND ulr.role = 'owner'
    )
  );

-- ===================
-- USER_LOCATION_ROLES POLICIES
-- ===================

-- Platform users can view all roles
CREATE POLICY "user_location_roles_select_platform" ON public.user_location_roles
  FOR SELECT TO authenticated
  USING (public.is_platform_user(auth.uid()));

-- Users can view their own roles
CREATE POLICY "user_location_roles_select_own" ON public.user_location_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Location members can view roles in their location
CREATE POLICY "user_location_roles_select_location" ON public.user_location_roles
  FOR SELECT TO authenticated
  USING (public.user_has_location_access(auth.uid(), location_id));

-- Platform admins can manage all roles
CREATE POLICY "user_location_roles_all_admin" ON public.user_location_roles
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Owners can manage roles in their location
CREATE POLICY "user_location_roles_insert_owner" ON public.user_location_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner']::location_role[]));

CREATE POLICY "user_location_roles_update_owner" ON public.user_location_roles
  FOR UPDATE TO authenticated
  USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner']::location_role[]));

CREATE POLICY "user_location_roles_delete_owner" ON public.user_location_roles
  FOR DELETE TO authenticated
  USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner']::location_role[]));

-- ===================
-- LOCATION_SUBSCRIPTIONS POLICIES
-- ===================

-- Location members can view subscription
CREATE POLICY "location_subscriptions_select" ON public.location_subscriptions
  FOR SELECT TO authenticated
  USING (
    public.is_platform_user(auth.uid()) OR
    public.user_has_location_access(auth.uid(), location_id)
  );

-- Only platform admins can manage subscriptions
CREATE POLICY "location_subscriptions_all_admin" ON public.location_subscriptions
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- ===================
-- LOCATION_ENTITLEMENTS POLICIES
-- ===================

-- Location members can view entitlements
CREATE POLICY "location_entitlements_select" ON public.location_entitlements
  FOR SELECT TO authenticated
  USING (
    public.is_platform_user(auth.uid()) OR
    public.user_has_location_access(auth.uid(), location_id)
  );

-- Only platform admins can manage entitlements
CREATE POLICY "location_entitlements_all_admin" ON public.location_entitlements
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- ===================
-- PERMISSIONS TABLES (READ-ONLY FOR ALL AUTHENTICATED)
-- ===================

CREATE POLICY "permissions_select_all" ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "permissions_all_admin" ON public.permissions
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "permission_sets_select_all" ON public.permission_sets
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "permission_sets_all_admin" ON public.permission_sets
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "permission_set_permissions_select_all" ON public.permission_set_permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "permission_set_permissions_all_admin" ON public.permission_set_permissions
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "role_permission_sets_select_all" ON public.role_permission_sets
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "role_permission_sets_all_admin" ON public.role_permission_sets
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- ===================
-- EMPLOYEES POLICIES
-- ===================

-- Platform users can view all employees
CREATE POLICY "employees_select_platform" ON public.employees
  FOR SELECT TO authenticated
  USING (public.is_platform_user(auth.uid()));

-- Location managers can view employees in their location
CREATE POLICY "employees_select_location" ON public.employees
  FOR SELECT TO authenticated
  USING (public.user_has_location_access(auth.uid(), location_id));

-- Employees can view their own record
CREATE POLICY "employees_select_own" ON public.employees
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Managers/owners can manage employees
CREATE POLICY "employees_insert" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin(auth.uid()) OR
    public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner', 'manager']::location_role[])
  );

CREATE POLICY "employees_update" ON public.employees
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin(auth.uid()) OR
    public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner', 'manager']::location_role[])
  );

CREATE POLICY "employees_delete" ON public.employees
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin(auth.uid()) OR
    public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner', 'manager']::location_role[])
  );

-- ===================
-- EMPLOYEE_INVITES POLICIES
-- ===================

-- Managers can view invites for their location
CREATE POLICY "employee_invites_select" ON public.employee_invites
  FOR SELECT TO authenticated
  USING (
    public.is_platform_user(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_invites.employee_id
      AND public.user_has_location_access(auth.uid(), e.location_id)
    )
  );

-- Managers can manage invites
CREATE POLICY "employee_invites_insert" ON public.employee_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_invites.employee_id
      AND public.user_has_role_in_location(auth.uid(), e.location_id, ARRAY['owner', 'manager']::location_role[])
    )
  );

CREATE POLICY "employee_invites_update" ON public.employee_invites
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_invites.employee_id
      AND public.user_has_role_in_location(auth.uid(), e.location_id, ARRAY['owner', 'manager']::location_role[])
    )
  );

CREATE POLICY "employee_invites_delete" ON public.employee_invites
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_invites.employee_id
      AND public.user_has_role_in_location(auth.uid(), e.location_id, ARRAY['owner', 'manager']::location_role[])
    )
  );

-- ===================
-- CONTRACTS POLICIES
-- ===================

-- Managers can view contracts
CREATE POLICY "contracts_select_manager" ON public.contracts
  FOR SELECT TO authenticated
  USING (
    public.is_platform_user(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = contracts.employee_id
      AND public.user_has_role_in_location(auth.uid(), e.location_id, ARRAY['owner', 'manager']::location_role[])
    )
  );

-- Employees can view their own contracts
CREATE POLICY "contracts_select_own" ON public.contracts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = contracts.employee_id AND e.user_id = auth.uid()
    )
  );

-- Managers can manage contracts
CREATE POLICY "contracts_insert" ON public.contracts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = contracts.employee_id
      AND public.user_has_role_in_location(auth.uid(), e.location_id, ARRAY['owner', 'manager']::location_role[])
    )
  );

CREATE POLICY "contracts_update" ON public.contracts
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = contracts.employee_id
      AND public.user_has_role_in_location(auth.uid(), e.location_id, ARRAY['owner', 'manager']::location_role[])
    )
  );

CREATE POLICY "contracts_delete" ON public.contracts
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = contracts.employee_id
      AND public.user_has_role_in_location(auth.uid(), e.location_id, ARRAY['owner', 'manager']::location_role[])
    )
  );

-- ===================
-- PAYSLIPS POLICIES
-- ===================

-- Managers can view payslips
CREATE POLICY "payslips_select_manager" ON public.payslips
  FOR SELECT TO authenticated
  USING (
    public.is_platform_user(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = payslips.employee_id
      AND public.user_has_role_in_location(auth.uid(), e.location_id, ARRAY['owner', 'manager']::location_role[])
    )
  );

-- Employees can view their own payslips
CREATE POLICY "payslips_select_own" ON public.payslips
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = payslips.employee_id AND e.user_id = auth.uid()
    )
  );

-- Managers can manage payslips
CREATE POLICY "payslips_insert" ON public.payslips
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = payslips.employee_id
      AND public.user_has_role_in_location(auth.uid(), e.location_id, ARRAY['owner', 'manager']::location_role[])
    )
  );

CREATE POLICY "payslips_update" ON public.payslips
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = payslips.employee_id
      AND public.user_has_role_in_location(auth.uid(), e.location_id, ARRAY['owner', 'manager']::location_role[])
    )
  );

CREATE POLICY "payslips_delete" ON public.payslips
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = payslips.employee_id
      AND public.user_has_role_in_location(auth.uid(), e.location_id, ARRAY['owner', 'manager']::location_role[])
    )
  );

-- ===================
-- ONBOARDING_TASKS POLICIES
-- ===================

-- Managers can view onboarding tasks
CREATE POLICY "onboarding_tasks_select_manager" ON public.onboarding_tasks
  FOR SELECT TO authenticated
  USING (
    public.is_platform_user(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = onboarding_tasks.employee_id
      AND public.user_has_role_in_location(auth.uid(), e.location_id, ARRAY['owner', 'manager']::location_role[])
    )
  );

-- Employees can view their own onboarding tasks
CREATE POLICY "onboarding_tasks_select_own" ON public.onboarding_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = onboarding_tasks.employee_id AND e.user_id = auth.uid()
    )
  );

-- Employees can update their own onboarding tasks
CREATE POLICY "onboarding_tasks_update_own" ON public.onboarding_tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = onboarding_tasks.employee_id AND e.user_id = auth.uid()
    )
  );

-- Managers can manage onboarding tasks
CREATE POLICY "onboarding_tasks_insert" ON public.onboarding_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = onboarding_tasks.employee_id
      AND public.user_has_role_in_location(auth.uid(), e.location_id, ARRAY['owner', 'manager']::location_role[])
    )
  );

CREATE POLICY "onboarding_tasks_update_manager" ON public.onboarding_tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = onboarding_tasks.employee_id
      AND public.user_has_role_in_location(auth.uid(), e.location_id, ARRAY['owner', 'manager']::location_role[])
    )
  );

CREATE POLICY "onboarding_tasks_delete" ON public.onboarding_tasks
  FOR DELETE TO authenticated
  USING (
    public.is_platform_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = onboarding_tasks.employee_id
      AND public.user_has_role_in_location(auth.uid(), e.location_id, ARRAY['owner', 'manager']::location_role[])
    )
  );