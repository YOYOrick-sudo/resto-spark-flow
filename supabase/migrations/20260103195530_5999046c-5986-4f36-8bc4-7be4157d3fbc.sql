-- ============================================
-- FASE 4.1: SAAS FOUNDATION - DATABASE SCHEMA
-- ============================================

-- ===================
-- CUSTOM TYPES (ENUMS)
-- ===================

-- Platform roles (global, not per org)
CREATE TYPE platform_role AS ENUM ('platform_admin', 'support');

-- Location roles
CREATE TYPE location_role AS ENUM ('owner', 'manager', 'service', 'kitchen', 'finance');

-- Module keys for entitlements
CREATE TYPE module_key AS ENUM ('reservations', 'kitchen', 'finance', 'hrm', 'marketing', 'settings');

-- Employee status
CREATE TYPE employee_status AS ENUM ('invited', 'active', 'archived');

-- ===================
-- CORE TABLES
-- ===================

-- Profiles (extends auth.users with global platform_role)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  platform_role platform_role, -- NULL = normal user, global not per org
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organizations (tenant wrapper)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  billing_contact TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Locations (venues under organization)
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Amsterdam',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organization memberships (user belongs to org, no platform_role here)
CREATE TABLE public.org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- ===================
-- ACCESS CONTROL
-- ===================

-- User location roles (1 role per user per location)
CREATE TABLE public.user_location_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  role location_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

-- ===================
-- BILLING & ENTITLEMENTS (PER LOCATION)
-- ===================

-- Location subscriptions (Stripe-ready)
CREATE TABLE public.location_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL UNIQUE REFERENCES public.locations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled')),
  plan_key TEXT NOT NULL DEFAULT 'starter',
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Location entitlements (module toggles per location)
CREATE TABLE public.location_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  module_key module_key NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(location_id, module_key)
);

-- ===================
-- PERMISSIONS SYSTEM
-- ===================

-- Permissions (all permission keys)
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permission sets (groups of permissions)
CREATE TABLE public.permission_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Permission set permissions (many-to-many)
CREATE TABLE public.permission_set_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_set_id UUID NOT NULL REFERENCES public.permission_sets(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE(permission_set_id, permission_id)
);

-- Role permission sets (1 set per role for MVP)
CREATE TABLE public.role_permission_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role location_role UNIQUE NOT NULL,
  permission_set_id UUID NOT NULL REFERENCES public.permission_sets(id) ON DELETE CASCADE
);

-- ===================
-- EMPLOYEE PORTAL
-- ===================

-- Employees (HR entity, user_id nullable for pre-onboarding)
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  status employee_status NOT NULL DEFAULT 'invited',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique email per location (lowercase)
CREATE UNIQUE INDEX employees_location_email_unique 
  ON public.employees (location_id, LOWER(email));

-- Employee invites
CREATE TABLE public.employee_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contracts
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  file_url TEXT NOT NULL,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payslips
CREATE TABLE public.payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Onboarding tasks
CREATE TABLE public.onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================
-- INDEXES
-- ===================

CREATE INDEX idx_locations_organization ON public.locations(organization_id);
CREATE INDEX idx_org_memberships_user ON public.org_memberships(user_id);
CREATE INDEX idx_org_memberships_org ON public.org_memberships(organization_id);
CREATE INDEX idx_user_location_roles_user ON public.user_location_roles(user_id);
CREATE INDEX idx_user_location_roles_location ON public.user_location_roles(location_id);
CREATE INDEX idx_location_entitlements_location ON public.location_entitlements(location_id);
CREATE INDEX idx_employees_location ON public.employees(location_id);
CREATE INDEX idx_employees_user ON public.employees(user_id);

-- ===================
-- UPDATED_AT TRIGGER FUNCTION
-- ===================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply to tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_location_subscriptions_updated_at
  BEFORE UPDATE ON public.location_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ===================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================
-- AUTO-CREATE ENTITLEMENTS ON LOCATION CREATE
-- ===================

CREATE OR REPLACE FUNCTION public.create_default_entitlements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.location_entitlements (location_id, module_key, enabled)
  SELECT NEW.id, unnest(enum_range(NULL::module_key)), false;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_location_created
  AFTER INSERT ON public.locations
  FOR EACH ROW EXECUTE FUNCTION public.create_default_entitlements();