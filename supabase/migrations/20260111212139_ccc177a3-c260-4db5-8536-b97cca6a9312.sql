-- ============================================
-- FASE 4.3.B: Reorder Shifts RPC
-- Atomic reordering with security + integrity checks
-- ============================================

CREATE OR REPLACE FUNCTION public.reorder_shifts(
  _location_id UUID,
  _shift_ids UUID[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _active_count int;
  _input_count int;
BEGIN
  -- Guard: empty/null array (no-op)
  IF _shift_ids IS NULL OR array_length(_shift_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', true, 'changed', false, 'reason', 'empty_array');
  END IF;

  -- SECURITY: Defense-in-depth - null auth check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- SECURITY: Auth check (owner/manager only)
  IF NOT user_has_role_in_location(auth.uid(), _location_id, 
    ARRAY['owner','manager']::location_role[]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Concurrency lock per location for shifts
  PERFORM pg_advisory_xact_lock(hashtext('shifts:' || _location_id::text));

  -- Guard: no duplicates
  _input_count := array_length(_shift_ids, 1);
  IF _input_count != (SELECT COUNT(DISTINCT id) FROM unnest(_shift_ids) AS id) THEN
    RAISE EXCEPTION 'Duplicate shift IDs not allowed';
  END IF;

  -- Guard: all IDs must be active shifts of this location
  IF EXISTS (
    SELECT 1 FROM unnest(_shift_ids) sid
    WHERE NOT EXISTS (
      SELECT 1 FROM shifts 
      WHERE id = sid AND location_id = _location_id AND is_active = true
    )
  ) THEN
    RAISE EXCEPTION 'Invalid shift IDs: must be active and belong to location';
  END IF;

  -- Guard: must include ALL active shifts
  SELECT COUNT(*) INTO _active_count
  FROM shifts WHERE location_id = _location_id AND is_active = true;
  
  IF _input_count != _active_count THEN
    RAISE EXCEPTION 'Must include all % active shifts, got %', _active_count, _input_count;
  END IF;

  -- Atomic update: normalize to 10,20,30... (stable spacing)
  UPDATE shifts s
  SET sort_order = new_order.ord * 10, updated_at = now()
  FROM (SELECT id, ord::int FROM unnest(_shift_ids) WITH ORDINALITY AS t(id, ord)) AS new_order
  WHERE s.id = new_order.id AND s.location_id = _location_id;

  RETURN jsonb_build_object('success', true, 'changed', true, 'count', _input_count);
END;
$$;