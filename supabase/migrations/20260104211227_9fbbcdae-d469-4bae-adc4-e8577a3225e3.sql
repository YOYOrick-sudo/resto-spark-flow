-- Architecture Lock: Fase 4.2 Constraints
-- =======================================
-- Gelocked op: 4 januari 2026

-- 1. table_number uniqueness: area -> location
-- --------------------------------------------
ALTER TABLE public.tables 
DROP CONSTRAINT tables_area_id_table_number_key;

ALTER TABLE public.tables 
ADD CONSTRAINT tables_location_id_table_number_key 
UNIQUE(location_id, table_number);

-- 2. Case-insensitive display_label uniqueness
-- --------------------------------------------
DROP INDEX IF EXISTS idx_tables_display_label_active;

CREATE UNIQUE INDEX idx_tables_display_label_active_ci 
ON public.tables(location_id, LOWER(display_label)) 
WHERE is_active = true;

-- 3. Update restore_table() - direct location_id + case-insensitive
-- ------------------------------------------------------------------
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
  -- Direct uit tables halen (niet via area join)
  SELECT location_id, display_label 
  INTO _location_id, _current_label
  FROM public.tables
  WHERE id = _table_id;
  
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

  -- Case-insensitive conflict check
  SELECT EXISTS (
    SELECT 1 FROM public.tables 
    WHERE location_id = _location_id 
    AND LOWER(display_label) = LOWER(_current_label)
    AND is_active = true 
    AND id != _table_id
  ) INTO _label_conflict;

  IF _label_conflict THEN
    RETURN jsonb_build_object(
      'restored', false, 
      'error', 'label_conflict',
      'message', 'Display label "' || _current_label || '" is already in use (case-insensitive)'
    );
  END IF;

  UPDATE public.tables 
  SET is_active = true, display_label = _current_label, updated_at = now()
  WHERE id = _table_id;

  RETURN jsonb_build_object('restored', true, 'display_label', _current_label);
END;
$$;

-- 4. Table Group Overlap Prevention Trigger
-- -----------------------------------------
-- Check verplaatst naar de functie (geen subquery in WHEN toegestaan)
CREATE OR REPLACE FUNCTION public.prevent_table_group_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _existing_group_name text;
  _target_group_is_active boolean;
  _target_group_is_system boolean;
BEGIN
  -- Check of target group actief en niet system-generated is
  SELECT is_active, is_system_generated
  INTO _target_group_is_active, _target_group_is_system
  FROM public.table_groups
  WHERE id = NEW.table_group_id;
  
  -- Skip check als group inactief of system-generated
  IF NOT _target_group_is_active OR _target_group_is_system THEN
    RETURN NEW;
  END IF;

  -- Check op overlap met andere actieve custom groups
  SELECT tg.name INTO _existing_group_name
  FROM public.table_group_members tgm
  JOIN public.table_groups tg ON tg.id = tgm.table_group_id
  WHERE tgm.table_id = NEW.table_id
    AND tg.is_active = true
    AND tg.is_system_generated = false
    AND tgm.table_group_id != NEW.table_group_id
  LIMIT 1;
  
  IF _existing_group_name IS NOT NULL THEN
    RAISE EXCEPTION 'Table is already in active group "%". MVP does not allow overlap.', _existing_group_name;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_table_group_overlap
BEFORE INSERT OR UPDATE OF table_group_id ON public.table_group_members
FOR EACH ROW 
EXECUTE FUNCTION public.prevent_table_group_overlap();

-- 5. Group Activation Overlap Check Trigger
-- -----------------------------------------
CREATE OR REPLACE FUNCTION public.check_group_activation_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _overlap_table_id uuid;
  _overlap_group_name text;
  _table_label text;
BEGIN
  -- Alleen checken als is_active van false naar true gaat
  -- en het geen system_generated group is
  IF OLD.is_active = false AND NEW.is_active = true AND NEW.is_system_generated = false THEN
    SELECT tgm.table_id, other_tg.name, t.display_label
    INTO _overlap_table_id, _overlap_group_name, _table_label
    FROM public.table_group_members tgm
    JOIN public.table_group_members other_tgm ON other_tgm.table_id = tgm.table_id
    JOIN public.table_groups other_tg ON other_tg.id = other_tgm.table_group_id
    JOIN public.tables t ON t.id = tgm.table_id
    WHERE tgm.table_group_id = NEW.id
      AND other_tgm.table_group_id != NEW.id
      AND other_tg.is_active = true
      AND other_tg.is_system_generated = false
    LIMIT 1;
    
    IF _overlap_table_id IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot activate group: table "%" is already in active group "%"', 
        _table_label, _overlap_group_name;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_group_activation_overlap
BEFORE UPDATE OF is_active ON public.table_groups
FOR EACH ROW
EXECUTE FUNCTION public.check_group_activation_overlap();