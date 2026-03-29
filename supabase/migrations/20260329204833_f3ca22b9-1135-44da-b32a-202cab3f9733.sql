-- 1. Add 4 pacing override columns to shift_exceptions
ALTER TABLE public.shift_exceptions
  ADD COLUMN IF NOT EXISTS override_pacing_limit_covers INTEGER,
  ADD COLUMN IF NOT EXISTS override_pacing_limit_arrivals INTEGER,
  ADD COLUMN IF NOT EXISTS override_max_covers_total INTEGER,
  ADD COLUMN IF NOT EXISTS override_online_booking_enabled BOOLEAN;

-- 2. Drop and recreate the RPC with 4 extra return columns
DROP FUNCTION IF EXISTS public.get_effective_shift_schedule(uuid, date);

CREATE OR REPLACE FUNCTION public.get_effective_shift_schedule(_location_id uuid, _date date)
RETURNS TABLE(
  shift_id uuid,
  shift_name text,
  short_name text,
  start_time time without time zone,
  end_time time without time zone,
  arrival_interval_minutes integer,
  color text,
  status text,
  exception_label text,
  effective_pacing_limit_covers integer,
  effective_pacing_limit_arrivals integer,
  effective_max_covers_total integer,
  effective_online_booking_enabled boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _dow INTEGER;
BEGIN
  IF NOT public.user_has_location_access(auth.uid(), _location_id) THEN
    RAISE EXCEPTION 'Access denied to location %', _location_id;
  END IF;

  _dow := EXTRACT(ISODOW FROM _date)::INTEGER;

  IF EXISTS (
    SELECT 1 FROM public.shift_exceptions
    WHERE location_id = _location_id
      AND shift_id IS NULL
      AND exception_date = _date
      AND exception_type = 'closed'
  ) THEN
    RETURN;
  END IF;

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
    e.label AS exception_label,
    e.override_pacing_limit_covers AS effective_pacing_limit_covers,
    e.override_pacing_limit_arrivals AS effective_pacing_limit_arrivals,
    e.override_max_covers_total AS effective_max_covers_total,
    COALESCE(e.override_online_booking_enabled, true) AS effective_online_booking_enabled
  FROM public.shifts s
  LEFT JOIN public.shift_exceptions e
    ON e.location_id = _location_id
    AND e.shift_id = s.id
    AND e.exception_date = _date
    AND e.exception_type != 'closed'
  WHERE s.location_id = _location_id
    AND s.is_active = true
    AND _dow = ANY(s.days_of_week)
    AND NOT EXISTS (
      SELECT 1 FROM public.shift_exceptions e2
      WHERE e2.location_id = _location_id
        AND e2.shift_id = s.id
        AND e2.exception_date = _date
        AND e2.exception_type = 'closed'
    )
  ORDER BY s.sort_order;
END;
$function$;