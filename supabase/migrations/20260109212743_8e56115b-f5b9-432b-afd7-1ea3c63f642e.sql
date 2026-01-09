-- ============================================
-- B2: reorder_tables RPC
-- Atomic reorder of tables within an area
-- ============================================

CREATE OR REPLACE FUNCTION public.reorder_tables(
  _area_id UUID,
  _table_ids UUID[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _location_id UUID;
  _active_count int;
  _input_count int;
  _current_order UUID[];
BEGIN
  -- Guard: empty/null array (no-op)
  IF _table_ids IS NULL OR array_length(_table_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', true, 'changed', false, 'reason', 'empty_array');
  END IF;

  -- Get location from area
  SELECT location_id INTO _location_id FROM areas WHERE id = _area_id;
  IF _location_id IS NULL THEN
    RAISE EXCEPTION 'Area not found';
  END IF;

  -- Auth check: owner/manager only
  IF NOT user_has_role_in_location(auth.uid(), _location_id, 
    ARRAY['owner','manager']::location_role[]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Concurrency lock per area
  PERFORM pg_advisory_xact_lock(hashtext(_area_id::text));

  -- Guard: no duplicates
  _input_count := array_length(_table_ids, 1);
  IF _input_count != (SELECT COUNT(DISTINCT id) FROM unnest(_table_ids) AS id) THEN
    RAISE EXCEPTION 'Duplicate table IDs not allowed';
  END IF;

  -- Guard: all IDs must be active tables of this area
  IF EXISTS (
    SELECT 1 FROM unnest(_table_ids) tid
    WHERE NOT EXISTS (
      SELECT 1 FROM tables 
      WHERE id = tid AND area_id = _area_id AND is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Invalid table IDs: must be active and belong to area';
  END IF;

  -- Guard: must include ALL active tables
  SELECT COUNT(*) INTO _active_count
  FROM tables WHERE area_id = _area_id AND is_active = true;
  
  IF _input_count != _active_count THEN
    RAISE EXCEPTION 'Must include all % active tables, got %', _active_count, _input_count;
  END IF;

  -- Idempotent check (deterministic order)
  SELECT array_agg(id ORDER BY sort_order, id) INTO _current_order
  FROM tables WHERE area_id = _area_id AND is_active = true;

  IF _current_order = _table_ids THEN
    RETURN jsonb_build_object('success', true, 'changed', false, 'reason', 'order_unchanged');
  END IF;

  -- Atomic update via UNNEST WITH ORDINALITY
  UPDATE tables t
  SET sort_order = new_order.ord * 10, updated_at = now()
  FROM (SELECT id, ord::int FROM unnest(_table_ids) WITH ORDINALITY AS t(id, ord)) AS new_order
  WHERE t.id = new_order.id AND t.area_id = _area_id;

  RETURN jsonb_build_object('success', true, 'changed', true, 'count', _input_count);
END;
$$;