-- ============================================
-- FASE 4.1: SEED DATA
-- ============================================

-- ===================
-- PERMISSIONS (ROOT VIEW + MODULE SPECIFIC)
-- ===================

INSERT INTO public.permissions (key) VALUES
  -- Root view permissions (for nav gating)
  ('reservations.view'),
  ('kitchen.view'),
  ('finance.view'),
  ('hrm.view'),
  ('marketing.view'),
  ('settings.view'),
  -- Reservations module
  ('reservations.edit'),
  ('reservations.create'),
  ('reservations.delete'),
  ('reservations.waitlist.manage'),
  ('reservations.settings'),
  -- Kitchen module
  ('kitchen.tickets.view'),
  ('kitchen.tickets.manage'),
  ('kitchen.mep.view'),
  ('kitchen.mep.edit'),
  ('kitchen.recipes.view'),
  ('kitchen.recipes.edit'),
  ('kitchen.ingredients.view'),
  ('kitchen.ingredients.edit'),
  ('kitchen.orders.view'),
  ('kitchen.orders.manage'),
  -- Finance module
  ('finance.reports.view'),
  ('finance.export'),
  ('finance.costs.view'),
  ('finance.costs.edit'),
  -- HRM module
  ('hrm.employees.view'),
  ('hrm.employees.edit'),
  ('hrm.docs.view'),
  ('hrm.docs.upload'),
  ('hrm.contracts.manage'),
  ('hrm.payslips.manage'),
  -- Marketing module
  ('marketing.campaigns.view'),
  ('marketing.campaigns.edit'),
  -- Settings module
  ('settings.general.view'),
  ('settings.general.edit'),
  ('settings.team.view'),
  ('settings.team.edit'),
  ('settings.integrations.view'),
  ('settings.integrations.edit');

-- ===================
-- PERMISSION SETS
-- ===================

INSERT INTO public.permission_sets (key) VALUES
  ('owner_default'),
  ('manager_default'),
  ('service_default'),
  ('kitchen_default'),
  ('finance_default'),
  ('employee_selfservice');

-- ===================
-- PERMISSION SET PERMISSIONS (WHAT EACH SET CONTAINS)
-- ===================

-- Owner gets ALL permissions
INSERT INTO public.permission_set_permissions (permission_set_id, permission_id)
SELECT 
  (SELECT id FROM public.permission_sets WHERE key = 'owner_default'),
  id
FROM public.permissions;

-- Manager gets most permissions except settings.team.edit
INSERT INTO public.permission_set_permissions (permission_set_id, permission_id)
SELECT 
  (SELECT id FROM public.permission_sets WHERE key = 'manager_default'),
  id
FROM public.permissions
WHERE key NOT IN ('settings.team.edit', 'settings.integrations.edit');

-- Service gets reservations + basic views
INSERT INTO public.permission_set_permissions (permission_set_id, permission_id)
SELECT 
  (SELECT id FROM public.permission_sets WHERE key = 'service_default'),
  id
FROM public.permissions
WHERE key IN (
  'reservations.view', 'reservations.edit', 'reservations.create', 'reservations.waitlist.manage',
  'kitchen.view', 'kitchen.tickets.view',
  'settings.view', 'settings.general.view'
);

-- Kitchen gets kitchen module + basic views
INSERT INTO public.permission_set_permissions (permission_set_id, permission_id)
SELECT 
  (SELECT id FROM public.permission_sets WHERE key = 'kitchen_default'),
  id
FROM public.permissions
WHERE key IN (
  'kitchen.view', 'kitchen.tickets.view', 'kitchen.tickets.manage',
  'kitchen.mep.view', 'kitchen.mep.edit',
  'kitchen.recipes.view', 'kitchen.recipes.edit',
  'kitchen.ingredients.view', 'kitchen.ingredients.edit',
  'kitchen.orders.view', 'kitchen.orders.manage',
  'settings.view', 'settings.general.view'
);

-- Finance gets finance module + basic views
INSERT INTO public.permission_set_permissions (permission_set_id, permission_id)
SELECT 
  (SELECT id FROM public.permission_sets WHERE key = 'finance_default'),
  id
FROM public.permissions
WHERE key IN (
  'finance.view', 'finance.reports.view', 'finance.export', 'finance.costs.view', 'finance.costs.edit',
  'kitchen.view', 'kitchen.recipes.view', 'kitchen.ingredients.view',
  'settings.view', 'settings.general.view'
);

-- Employee selfservice gets only hrm.docs.view
INSERT INTO public.permission_set_permissions (permission_set_id, permission_id)
SELECT 
  (SELECT id FROM public.permission_sets WHERE key = 'employee_selfservice'),
  id
FROM public.permissions
WHERE key IN ('hrm.view', 'hrm.docs.view');

-- ===================
-- ROLE PERMISSION SETS (1 SET PER ROLE)
-- ===================

INSERT INTO public.role_permission_sets (role, permission_set_id)
SELECT 'owner'::location_role, id FROM public.permission_sets WHERE key = 'owner_default';

INSERT INTO public.role_permission_sets (role, permission_set_id)
SELECT 'manager'::location_role, id FROM public.permission_sets WHERE key = 'manager_default';

INSERT INTO public.role_permission_sets (role, permission_set_id)
SELECT 'service'::location_role, id FROM public.permission_sets WHERE key = 'service_default';

INSERT INTO public.role_permission_sets (role, permission_set_id)
SELECT 'kitchen'::location_role, id FROM public.permission_sets WHERE key = 'kitchen_default';

INSERT INTO public.role_permission_sets (role, permission_set_id)
SELECT 'finance'::location_role, id FROM public.permission_sets WHERE key = 'finance_default';