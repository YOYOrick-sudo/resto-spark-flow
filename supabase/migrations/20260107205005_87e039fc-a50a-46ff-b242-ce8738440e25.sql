-- B1: Reorder Areas RPC with all guards
CREATE OR REPLACE FUNCTION public.reorder_areas(
  _location_id UUID,
  _area_ids UUID[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _active_count int;
  _input_count int;
  _current_order UUID[];
BEGIN
  -- Guard: empty or null array
  IF _area_ids IS NULL OR array_length(_area_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', true, 'changed', false, 'reason', 'empty_array');
  END IF;

  -- Auth check: owner/manager only
  IF NOT user_has_role_in_location(auth.uid(), _location_id, 
    ARRAY['owner','manager']::location_role[]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Concurrency lock per location
  PERFORM pg_advisory_xact_lock(hashtext(_location_id::text));

  -- Guard: no duplicate IDs
  _input_count := array_length(_area_ids, 1);
  IF _input_count != (SELECT COUNT(DISTINCT id) FROM unnest(_area_ids) AS id) THEN
    RAISE EXCEPTION 'Duplicate area IDs not allowed';
  END IF;

  -- Guard: all IDs must be active areas of this location
  IF EXISTS (
    SELECT 1 FROM unnest(_area_ids) aid
    WHERE NOT EXISTS (
      SELECT 1 FROM areas 
      WHERE id = aid AND location_id = _location_id AND is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Invalid area IDs: must be active and belong to location';
  END IF;

  -- Guard: must include ALL active areas
  SELECT COUNT(*) INTO _active_count
  FROM areas WHERE location_id = _location_id AND is_active = true;
  
  IF _input_count != _active_count THEN
    RAISE EXCEPTION 'Must include all % active areas, got %', _active_count, _input_count;
  END IF;

  -- Idempotent check: deterministic current order via ORDER BY sort_order, id
  SELECT array_agg(id ORDER BY sort_order, id) INTO _current_order
  FROM areas
  WHERE location_id = _location_id AND is_active = true;

  IF _current_order = _area_ids THEN
    RETURN jsonb_build_object('success', true, 'changed', false, 'reason', 'order_unchanged');
  END IF;

  -- Atomic update via UNNEST WITH ORDINALITY
  UPDATE areas a
  SET 
    sort_order = new_order.ord * 10,
    updated_at = now()
  FROM (
    SELECT id, ord::int 
    FROM unnest(_area_ids) WITH ORDINALITY AS t(id, ord)
  ) AS new_order
  WHERE a.id = new_order.id AND a.location_id = _location_id;

  RETURN jsonb_build_object('success', true, 'changed', true, 'count', _input_count);
END;
$$;