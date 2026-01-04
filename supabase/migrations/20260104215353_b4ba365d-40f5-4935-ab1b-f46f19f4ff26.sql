-- ============================================
-- SCOPE A: Sort Order RPCs met Authorization
-- ============================================

-- Helper RPC: Next area sort_order (stappen van 10)
CREATE OR REPLACE FUNCTION public.get_next_area_sort_order(_location_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(MAX(sort_order), 0) + 10 
  FROM public.areas 
  WHERE location_id = _location_id;
$$;

-- Helper RPC: Next table sort_order (stappen van 10)
CREATE OR REPLACE FUNCTION public.get_next_table_sort_order(_area_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(MAX(sort_order), 0) + 10 
  FROM public.tables 
  WHERE area_id = _area_id;
$$;

-- Swap area sort_order (atomair, met auth)
CREATE OR REPLACE FUNCTION public.swap_area_sort_order(
  _area_a_id UUID,
  _area_b_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sort_a INT;
  _sort_b INT;
  _location_id UUID;
BEGIN
  -- Get current values + location
  SELECT sort_order, location_id INTO _sort_a, _location_id
  FROM public.areas WHERE id = _area_a_id;
  
  IF _location_id IS NULL THEN
    RAISE EXCEPTION 'Area not found';
  END IF;
  
  -- Verify same location
  SELECT sort_order INTO _sort_b
  FROM public.areas WHERE id = _area_b_id AND location_id = _location_id;
  
  IF _sort_b IS NULL THEN
    RAISE EXCEPTION 'Areas must belong to same location';
  END IF;
  
  -- Authorization check: owner or manager
  IF NOT public.user_has_role_in_location(auth.uid(), _location_id, ARRAY['owner','manager']::location_role[]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Atomic swap with CASE statement
  UPDATE public.areas SET sort_order = CASE
    WHEN id = _area_a_id THEN _sort_b
    WHEN id = _area_b_id THEN _sort_a
  END, updated_at = now()
  WHERE id IN (_area_a_id, _area_b_id);
END;
$$;

-- Swap table sort_order (atomair, met auth)
CREATE OR REPLACE FUNCTION public.swap_table_sort_order(
  _table_a_id UUID,
  _table_b_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sort_a INT;
  _sort_b INT;
  _area_id UUID;
  _location_id UUID;
BEGIN
  -- Get current values + area
  SELECT sort_order, area_id INTO _sort_a, _area_id
  FROM public.tables WHERE id = _table_a_id;
  
  IF _area_id IS NULL THEN
    RAISE EXCEPTION 'Table not found';
  END IF;
  
  -- Get location from area
  SELECT location_id INTO _location_id FROM public.areas WHERE id = _area_id;
  
  -- Verify same area
  SELECT sort_order INTO _sort_b
  FROM public.tables WHERE id = _table_b_id AND area_id = _area_id;
  
  IF _sort_b IS NULL THEN
    RAISE EXCEPTION 'Tables must belong to same area';
  END IF;
  
  -- Authorization check: owner or manager
  IF NOT public.user_has_role_in_location(auth.uid(), _location_id, ARRAY['owner','manager']::location_role[]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Atomic swap
  UPDATE public.tables SET sort_order = CASE
    WHEN id = _table_a_id THEN _sort_b
    WHEN id = _table_b_id THEN _sort_a
  END, updated_at = now()
  WHERE id IN (_table_a_id, _table_b_id);
END;
$$;