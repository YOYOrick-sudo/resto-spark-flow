# NESTO DATABASE SCHEMA

## Overzicht

Dit document beschrijft het complete database schema voor Nesto SaaS platform.

---

## Custom Types (Enums)

```sql
-- Platform roles (global)
CREATE TYPE platform_role AS ENUM ('platform_admin', 'support');

-- Location roles
CREATE TYPE location_role AS ENUM ('owner', 'manager', 'service', 'kitchen', 'finance');

-- Module keys
CREATE TYPE module_key AS ENUM ('reservations', 'kitchen', 'finance', 'hrm', 'marketing', 'settings');

-- Employee status
CREATE TYPE employee_status AS ENUM ('invited', 'active', 'archived');
```

---

## Core Tabellen

### profiles
Extends auth.users met extra velden en globale platform_role.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | References auth.users(id) |
| email | TEXT (UNIQUE) | Email address |
| name | TEXT | Display name |
| platform_role | platform_role | Global platform role (NULL = normal user) |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### organizations
Tenant wrapper (klantbedrijf).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| name | TEXT | Organization name |
| billing_contact | TEXT | Billing contact email |
| status | TEXT | active, suspended, cancelled |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### locations
Vestigingen onder organization.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| organization_id | UUID (FK) | References organizations(id) |
| name | TEXT | Location name |
| slug | TEXT (UNIQUE) | URL-friendly identifier |
| timezone | TEXT | Timezone (default: Europe/Amsterdam) |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### org_memberships
User belongs to organization.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| user_id | UUID (FK) | References auth.users(id) |
| organization_id | UUID (FK) | References organizations(id) |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Constraints:** UNIQUE(user_id, organization_id)

---

## Access Control Tabellen

### user_location_roles
Role per user per location.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| user_id | UUID (FK) | References auth.users(id) |
| location_id | UUID (FK) | References locations(id) |
| role | location_role | Role at this location |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Constraints:** UNIQUE(user_id, location_id)

---

## Billing & Entitlements Tabellen

### location_subscriptions
Stripe-ready subscription per location.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| location_id | UUID (FK, UNIQUE) | References locations(id) |
| status | TEXT | trialing, active, past_due, cancelled |
| plan_key | TEXT | Plan identifier |
| trial_ends_at | TIMESTAMPTZ | Trial end date |
| stripe_customer_id | TEXT | Stripe customer ID |
| stripe_subscription_id | TEXT | Stripe subscription ID |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### location_entitlements
Module toggles per location.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| location_id | UUID (FK) | References locations(id) |
| module_key | module_key | Module identifier |
| enabled | BOOLEAN | Is module enabled |
| created_at | TIMESTAMPTZ | Creation timestamp |

**Constraints:** UNIQUE(location_id, module_key)

---

## Permissions Tabellen

### permissions
Individual permission keys.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| key | TEXT (UNIQUE) | Permission key (e.g., reservations.view) |
| created_at | TIMESTAMPTZ | Creation timestamp |

### permission_sets
Groups of permissions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| key | TEXT (UNIQUE) | Set identifier (e.g., owner_default) |
| created_at | TIMESTAMPTZ | Creation timestamp |

### permission_set_permissions
Many-to-many: set to permissions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| permission_set_id | UUID (FK) | References permission_sets(id) |
| permission_id | UUID (FK) | References permissions(id) |

**Constraints:** UNIQUE(permission_set_id, permission_id)

### role_permission_sets
1 set per role (MVP).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| role | location_role (UNIQUE) | Role identifier |
| permission_set_id | UUID (FK) | References permission_sets(id) |

---

## Employee Portal Tabellen

### employees
HR entity per location.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| location_id | UUID (FK) | References locations(id) |
| user_id | UUID (FK, nullable) | References auth.users(id) |
| first_name | TEXT | First name |
| last_name | TEXT | Last name |
| email | TEXT | Email address |
| status | employee_status | invited, active, archived |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Indexes:** UNIQUE(location_id, LOWER(email))

### employee_invites
Invite tokens for employees.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| employee_id | UUID (FK) | References employees(id) |
| token | TEXT (UNIQUE) | Invite token |
| expires_at | TIMESTAMPTZ | Expiration date |
| accepted_at | TIMESTAMPTZ | When accepted |
| created_at | TIMESTAMPTZ | Creation timestamp |

### contracts
Employee contracts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| employee_id | UUID (FK) | References employees(id) |
| version | INTEGER | Contract version |
| file_url | TEXT | Storage URL |
| signed_at | TIMESTAMPTZ | When signed |
| created_at | TIMESTAMPTZ | Creation timestamp |

### payslips
Employee payslips.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| employee_id | UUID (FK) | References employees(id) |
| period_start | DATE | Period start |
| period_end | DATE | Period end |
| file_url | TEXT | Storage URL |
| created_at | TIMESTAMPTZ | Creation timestamp |

### onboarding_tasks
Employee onboarding checklist.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| employee_id | UUID (FK) | References employees(id) |
| key | TEXT | Task identifier |
| status | TEXT | pending, completed |
| completed_at | TIMESTAMPTZ | When completed |
| created_at | TIMESTAMPTZ | Creation timestamp |

---

## Security Functions

### is_platform_admin(user_id)
Check if user is platform admin.

### is_platform_user(user_id)
Check if user is platform admin or support.

### user_in_organization(user_id, org_id)
Check if user is member of organization.

### user_has_location_access(user_id, location_id)
Check if user has role at location.

### user_has_role_in_location(user_id, location_id, roles[])
Check if user has specific role(s) at location.

### get_user_permissions(user_id, location_id)
Get all permissions for user at location.

### get_user_context(user_id, location_id)
**CENTRAL CONTEXT RESOLVER** - Returns complete user context.

### is_employee_at_location(user_id, location_id)
Check if user is employee at location.

### get_employee_id(user_id, location_id)
Get employee ID for user at location.

---

## Triggers

### on_auth_user_created
Creates profile when user signs up.

### on_location_created
Creates default entitlements (all disabled) for new location.

### update_*_updated_at
Updates updated_at column on table changes.

---

## Seeded Data

### Permissions (45+)
Root view permissions + module-specific permissions.

### Permission Sets (6)
- owner_default
- manager_default
- service_default
- kitchen_default
- finance_default
- employee_selfservice

### Role Mappings
Each location_role maps to exactly one permission_set.
