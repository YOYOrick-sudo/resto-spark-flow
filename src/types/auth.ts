
// Platform roles (global, not per org)
export type PlatformRole = 'platform_admin' | 'support';

// Location roles
export type LocationRole = 'owner' | 'manager' | 'service' | 'kitchen' | 'finance';

// Module keys for entitlements
export type ModuleKey = 'reservations' | 'kitchen' | 'finance' | 'hrm' | 'marketing' | 'settings' | 'onboarding';

// Entitlement for a module
export interface ModuleEntitlement {
  module: ModuleKey;
  enabled: boolean;
}

// User context from get_user_context() - THE CENTRAL SOURCE OF TRUTH
export interface UserContext {
  user_id: string;
  location_id: string;
  organization_id: string;
  role: LocationRole | null;
  is_platform_admin: boolean;
  is_platform_user: boolean;
  permissions: string[];
  entitlements: ModuleEntitlement[];
}

// Profile data
export interface Profile {
  id: string;
  email: string;
  name: string | null;
  platform_role: PlatformRole | null;
  created_at: string;
  updated_at: string;
}

// Organization
export interface Organization {
  id: string;
  name: string;
  billing_contact: string | null;
  status: 'active' | 'suspended' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// Location
export interface Location {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// User location role assignment
export interface UserLocationRole {
  id: string;
  user_id: string;
  location_id: string;
  role: LocationRole;
  created_at: string;
}

// Location subscription
export interface LocationSubscription {
  id: string;
  location_id: string;
  status: 'trialing' | 'active' | 'past_due' | 'cancelled';
  plan_key: string;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

// Location entitlement
export interface LocationEntitlement {
  id: string;
  location_id: string;
  module_key: ModuleKey;
  enabled: boolean;
  created_at: string;
}

// Auth state for the application
export interface AuthState {
  user: Profile | null;
  session: import('@supabase/supabase-js').Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Location state
export interface LocationState {
  currentLocation: Location | null;
  availableLocations: Location[];
  isLoading: boolean;
}

// Combined user context state
export interface UserContextState {
  auth: AuthState;
  location: LocationState;
  context: UserContext | null;
  isContextLoading: boolean;
}
