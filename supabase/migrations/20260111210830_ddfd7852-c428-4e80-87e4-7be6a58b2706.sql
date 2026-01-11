-- Fix: Add explicit access check to SECURITY DEFINER function
-- This is required because SECURITY DEFINER bypasses RLS

CREATE OR REPLACE FUNCTION public.get_effective_shift_schedule(
  _location_id UUID,
  _date DATE
)
RETURNS TABLE (
  shift_id UUID,
  shift_name TEXT,
  short_name TEXT,
  start_time TIME,
  end_time TIME,
  arrival_interval_minutes INTEGER,
  color TEXT,
  status TEXT,
  exception_label TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dow INTEGER;
BEGIN
  -- SECURITY: Verify caller has access to this location
  -- Required because SECURITY DEFINER bypasses RLS
  IF NOT public.user_has_location_access(auth.uid(), _location_id) THEN
    RAISE EXCEPTION 'Access denied to location %', _location_id;
  END IF;

  _dow := EXTRACT(ISODOW FROM _date)::INTEGER;

  -- Check for location-wide closed exception (shift_id IS NULL)
  IF EXISTS (
    SELECT 1 FROM public.shift_exceptions
    WHERE location_id = _location_id
      AND shift_id IS NULL
      AND exception_date = _date
      AND exception_type = 'closed'
  ) THEN
    -- Location is closed, return empty set
    RETURN;
  END IF;

  -- Return effective shifts for the date
  RETURN QUERY
  SELECT
    s.id AS shift_id,
    s.name AS shift_name,
    s.short_name,
    COALESCE(e.override_start_time, s.start_time) AS start_time,
    COALESCE(e.override_end_time, s.end_time) AS end_time,
    s.arrival_interval_minutes,
    s.color,
    CASE 
      WHEN e.exception_type IS NOT NULL THEN e.exception_type::TEXT
      ELSE 'active'
    END AS status,
    e.label AS exception_label
  FROM public.shifts s
  LEFT JOIN public.shift_exceptions e
    ON e.shift_id = s.id
    AND e.exception_date = _date
    AND e.location_id = _location_id
  WHERE s.location_id = _location_id
    AND s.is_active = true
    AND _dow = ANY(s.days_of_week)
    AND (e.exception_type IS NULL OR e.exception_type != 'closed')
  ORDER BY s.sort_order;
END;
$$;

-- INVARIANTS (niet DB-enforced, UI/engine verantwoordelijk):
-- 1. Shifts mogen niet overlappen op dezelfde dag/locatie
-- 2. Overlap validatie wordt afgedwongen in:
--    - UI (ShiftModal validation)
--    - Availability Engine (Fase 4.5)