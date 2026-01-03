-- Fase 4.2: Areas, Tables & TableGroups CRUD
-- ============================================

-- 1. ENUM TYPE
-- --------------------------------------------
CREATE TYPE fill_order_type AS ENUM ('first_available', 'round_robin', 'priority', 'custom');

-- 2. TABLES
-- --------------------------------------------

-- Areas
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  fill_order fill_order_type NOT NULL DEFAULT 'first_available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, name)
);

-- Tables
CREATE TABLE public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT,
  table_number INTEGER NOT NULL,
  display_label TEXT NOT NULL DEFAULT '',
  min_capacity INTEGER NOT NULL DEFAULT 2,
  max_capacity INTEGER NOT NULL DEFAULT 4,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_online_bookable BOOLEAN NOT NULL DEFAULT true,
  is_joinable BOOLEAN NOT NULL DEFAULT true,
  join_priority INTEGER NOT NULL DEFAULT 0,
  assign_priority INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(area_id, table_number),
  CHECK(min_capacity >= 1),
  CHECK(min_capacity <= max_capacity),
  CHECK(join_priority >= 0 AND join_priority <= 100),
  CHECK(assign_priority >= 0 AND assign_priority <= 100)
);

-- Table Groups
CREATE TABLE public.table_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  combined_min_capacity INTEGER NOT NULL DEFAULT 0,
  combined_max_capacity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_online_bookable BOOLEAN NOT NULL DEFAULT true,
  is_system_generated BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, name)
);

-- Table Group Members
CREATE TABLE public.table_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_group_id UUID NOT NULL REFERENCES public.table_groups(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(table_group_id, table_id)
);

-- Reservation Settings
CREATE TABLE public.reservation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE UNIQUE,
  allow_multi_table BOOLEAN NOT NULL DEFAULT true,
  auto_assign BOOLEAN NOT NULL DEFAULT false,
  default_duration_minutes INTEGER NOT NULL DEFAULT 120,
  booking_cutoff_minutes INTEGER NOT NULL DEFAULT 120,
  default_buffer_minutes INTEGER NOT NULL DEFAULT 0,
  squeeze_enabled BOOLEAN NOT NULL DEFAULT true,
  default_squeeze_duration_minutes INTEGER NOT NULL DEFAULT 90,
  waitlist_auto_invite_enabled BOOLEAN NOT NULL DEFAULT true,
  max_parallel_invites INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK(max_parallel_invites >= 1),
  CHECK(booking_cutoff_minutes >= 0),
  CHECK(default_buffer_minutes >= 0),
  CHECK(default_squeeze_duration_minutes >= 15),
  CHECK(default_duration_minutes >= 15),
  CHECK(default_squeeze_duration_minutes <= default_duration_minutes)
);

-- 3. INDEXES
-- --------------------------------------------
CREATE INDEX idx_areas_location_sort ON public.areas(location_id, sort_order);
CREATE INDEX idx_tables_location ON public.tables(location_id);
CREATE INDEX idx_tables_area_sort ON public.tables(area_id, sort_order, is_active);
CREATE INDEX idx_table_groups_location ON public.table_groups(location_id);
CREATE INDEX idx_table_group_members_group ON public.table_group_members(table_group_id);
CREATE INDEX idx_table_group_members_table ON public.table_group_members(table_id);

-- Partial unique index for display_label (only active tables)
CREATE UNIQUE INDEX idx_tables_display_label_active 
ON public.tables(location_id, display_label) 
WHERE is_active = true;

-- 4. SECURITY FUNCTIONS
-- --------------------------------------------

-- Get location for area
CREATE OR REPLACE FUNCTION public.get_location_for_area(_area_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.location_id
  FROM public.areas a
  WHERE a.id = _area_id
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_location_for_area(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_location_for_area(uuid) TO authenticated;

-- Get location for table group
CREATE OR REPLACE FUNCTION public.get_location_for_table_group(_table_group_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tg.location_id
  FROM public.table_groups tg
  WHERE tg.id = _table_group_id
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_location_for_table_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_location_for_table_group(uuid) TO authenticated;

-- 5. TRIGGERS
-- --------------------------------------------

-- Sync tables.location_id from area
CREATE OR REPLACE FUNCTION sync_table_location_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT location_id INTO NEW.location_id 
  FROM public.areas 
  WHERE id = NEW.area_id;
  
  IF NEW.location_id IS NULL THEN
    RAISE EXCEPTION 'Area not found for area_id %', NEW.area_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sync_table_location
BEFORE INSERT OR UPDATE OF area_id ON public.tables
FOR EACH ROW EXECUTE FUNCTION sync_table_location_id();

-- Auto-generate display_label
CREATE OR REPLACE FUNCTION generate_table_display_label()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_label IS NULL OR NEW.display_label = '' THEN
    NEW.display_label := 'Tafel ' || NEW.table_number::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_generate_display_label
BEFORE INSERT ON public.tables
FOR EACH ROW EXECUTE FUNCTION generate_table_display_label();

-- Update group capacities (only active tables)
CREATE OR REPLACE FUNCTION update_table_group_capacities()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.table_groups tg
  SET 
    combined_min_capacity = COALESCE((
      SELECT SUM(t.min_capacity)
      FROM public.table_group_members tgm
      JOIN public.tables t ON t.id = tgm.table_id AND t.is_active = true
      WHERE tgm.table_group_id = tg.id
    ), 0),
    combined_max_capacity = COALESCE((
      SELECT SUM(t.max_capacity)
      FROM public.table_group_members tgm
      JOIN public.tables t ON t.id = tgm.table_id AND t.is_active = true
      WHERE tgm.table_group_id = tg.id
    ), 0),
    updated_at = now()
  WHERE tg.id = COALESCE(NEW.table_group_id, OLD.table_group_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_update_group_capacities
AFTER INSERT OR UPDATE OR DELETE ON public.table_group_members
FOR EACH ROW EXECUTE FUNCTION update_table_group_capacities();

-- Validate group member location (via area join)
CREATE OR REPLACE FUNCTION validate_table_group_member_location()
RETURNS TRIGGER AS $$
DECLARE
  group_location_id UUID;
  table_location_id UUID;
BEGIN
  SELECT location_id INTO group_location_id 
  FROM public.table_groups WHERE id = NEW.table_group_id;
  
  SELECT a.location_id INTO table_location_id 
  FROM public.tables t
  JOIN public.areas a ON a.id = t.area_id
  WHERE t.id = NEW.table_id;
  
  IF group_location_id IS NULL THEN
    RAISE EXCEPTION 'Table group not found';
  END IF;
  
  IF table_location_id IS NULL THEN
    RAISE EXCEPTION 'Table not found';
  END IF;
  
  IF group_location_id != table_location_id THEN
    RAISE EXCEPTION 'Table must belong to same location as table group';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_group_member_location
BEFORE INSERT OR UPDATE ON public.table_group_members
FOR EACH ROW EXECUTE FUNCTION validate_table_group_member_location();

-- Recalc groups on table changes (is_active, capacities)
CREATE OR REPLACE FUNCTION recalc_groups_for_table()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.table_groups tg
  SET 
    combined_min_capacity = COALESCE((
      SELECT SUM(t.min_capacity)
      FROM public.table_group_members tgm
      JOIN public.tables t ON t.id = tgm.table_id AND t.is_active = true
      WHERE tgm.table_group_id = tg.id
    ), 0),
    combined_max_capacity = COALESCE((
      SELECT SUM(t.max_capacity)
      FROM public.table_group_members tgm
      JOIN public.tables t ON t.id = tgm.table_id AND t.is_active = true
      WHERE tgm.table_group_id = tg.id
    ), 0),
    updated_at = now()
  WHERE tg.id IN (
    SELECT table_group_id FROM public.table_group_members WHERE table_id = NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_recalc_groups_on_table_change
AFTER UPDATE OF is_active, min_capacity, max_capacity ON public.tables
FOR EACH ROW EXECUTE FUNCTION recalc_groups_for_table();

-- Updated_at triggers
CREATE TRIGGER update_areas_updated_at
BEFORE UPDATE ON public.areas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tables_updated_at
BEFORE UPDATE ON public.tables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_table_groups_updated_at
BEFORE UPDATE ON public.table_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservation_settings_updated_at
BEFORE UPDATE ON public.reservation_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RPCs
-- --------------------------------------------

-- Archive area (atomic: area + all tables)
CREATE OR REPLACE FUNCTION public.archive_area(_area_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _location_id uuid;
  _tables_count int;
  _was_active boolean;
BEGIN
  SELECT location_id, is_active INTO _location_id, _was_active 
  FROM public.areas WHERE id = _area_id;
  
  IF _location_id IS NULL THEN 
    RAISE EXCEPTION 'Area not found'; 
  END IF;
  
  IF NOT _was_active THEN
    RETURN jsonb_build_object('archived_area', false, 'archived_tables', 0, 'message', 'Area was already archived');
  END IF;

  IF NOT public.user_has_role_in_location(auth.uid(), _location_id, ARRAY['owner','manager']::location_role[]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.tables SET is_active = false, updated_at = now()
  WHERE area_id = _area_id AND is_active = true;
  GET DIAGNOSTICS _tables_count = ROW_COUNT;

  UPDATE public.areas SET is_active = false, updated_at = now()
  WHERE id = _area_id;

  RETURN jsonb_build_object('archived_area', true, 'archived_tables', _tables_count);
END;
$$;

REVOKE ALL ON FUNCTION public.archive_area(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_area(uuid) TO authenticated;

-- Restore table (with label conflict handling)
CREATE OR REPLACE FUNCTION public.restore_table(_table_id uuid, _new_display_label text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _location_id uuid;
  _current_label text;
  _label_conflict boolean;
BEGIN
  SELECT a.location_id, t.display_label 
  INTO _location_id, _current_label
  FROM public.tables t
  JOIN public.areas a ON a.id = t.area_id
  WHERE t.id = _table_id;
  
  IF _location_id IS NULL THEN 
    RAISE EXCEPTION 'Table not found'; 
  END IF;

  IF NOT public.user_has_role_in_location(auth.uid(), _location_id, ARRAY['owner','manager']::location_role[]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _new_display_label IS NOT NULL THEN
    _current_label := _new_display_label;
  END IF;

  IF _current_label IS NULL OR btrim(_current_label) = '' THEN
    RETURN jsonb_build_object(
      'restored', false, 
      'error', 'label_invalid',
      'message', 'Display label cannot be empty'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.tables 
    WHERE location_id = _location_id 
    AND display_label = _current_label 
    AND is_active = true 
    AND id != _table_id
  ) INTO _label_conflict;

  IF _label_conflict THEN
    RETURN jsonb_build_object(
      'restored', false, 
      'error', 'label_conflict',
      'message', 'Display label "' || _current_label || '" is already in use'
    );
  END IF;

  UPDATE public.tables 
  SET is_active = true, display_label = _current_label, updated_at = now()
  WHERE id = _table_id;

  RETURN jsonb_build_object('restored', true, 'display_label', _current_label);
END;
$$;

REVOKE ALL ON FUNCTION public.restore_table(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_table(uuid, text) TO authenticated;

-- 7. RLS POLICIES
-- --------------------------------------------

-- Areas
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY areas_select ON public.areas FOR SELECT
USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY areas_insert ON public.areas FOR INSERT
WITH CHECK (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner', 'manager']::location_role[]));

CREATE POLICY areas_update ON public.areas FOR UPDATE
USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner', 'manager']::location_role[]));

-- Tables
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY tables_select ON public.tables FOR SELECT
USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY tables_insert ON public.tables FOR INSERT
WITH CHECK (public.user_has_role_in_location(auth.uid(), public.get_location_for_area(area_id), ARRAY['owner', 'manager']::location_role[]));

CREATE POLICY tables_update ON public.tables FOR UPDATE
USING (public.user_has_role_in_location(auth.uid(), public.get_location_for_area(area_id), ARRAY['owner', 'manager']::location_role[]));

-- Table Groups
ALTER TABLE public.table_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY table_groups_select ON public.table_groups FOR SELECT
USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY table_groups_insert ON public.table_groups FOR INSERT
WITH CHECK (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner', 'manager']::location_role[]));

CREATE POLICY table_groups_update ON public.table_groups FOR UPDATE
USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner', 'manager']::location_role[]));

-- Table Group Members
ALTER TABLE public.table_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY table_group_members_select ON public.table_group_members FOR SELECT
USING (public.user_has_location_access(auth.uid(), public.get_location_for_table_group(table_group_id)));

CREATE POLICY table_group_members_insert ON public.table_group_members FOR INSERT
WITH CHECK (
  public.user_has_role_in_location(auth.uid(), public.get_location_for_table_group(table_group_id), ARRAY['owner', 'manager']::location_role[])
  AND EXISTS (
    SELECT 1 FROM public.table_groups tg 
    WHERE tg.id = table_group_id 
    AND tg.is_active = true
    AND tg.is_system_generated = false
  )
);

CREATE POLICY table_group_members_update ON public.table_group_members FOR UPDATE
USING (
  public.user_has_role_in_location(auth.uid(), public.get_location_for_table_group(table_group_id), ARRAY['owner', 'manager']::location_role[])
  AND EXISTS (
    SELECT 1 FROM public.table_groups tg 
    WHERE tg.id = table_group_members.table_group_id 
    AND tg.is_active = true
    AND tg.is_system_generated = false
  )
);

CREATE POLICY table_group_members_delete ON public.table_group_members FOR DELETE
USING (
  public.user_has_role_in_location(auth.uid(), public.get_location_for_table_group(table_group_id), ARRAY['owner', 'manager']::location_role[])
  AND EXISTS (
    SELECT 1 FROM public.table_groups tg 
    WHERE tg.id = table_group_members.table_group_id 
    AND tg.is_active = true
    AND tg.is_system_generated = false
  )
);

-- Reservation Settings
ALTER TABLE public.reservation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY reservation_settings_select ON public.reservation_settings FOR SELECT
USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY reservation_settings_insert ON public.reservation_settings FOR INSERT
WITH CHECK (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner', 'manager']::location_role[]));

CREATE POLICY reservation_settings_update ON public.reservation_settings FOR UPDATE
USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner', 'manager']::location_role[]));