-- Fix: operating-hours RPCs blokkeren edge functions (service-role context)
--
-- PROBLEEM: is_location_open / get_operating_schedule / get_operating_hours
-- hadden allemaal als eerste regel:
--   IF NOT public.user_has_location_access(auth.uid(), _location_id) THEN RETURN ...; END IF;
-- 
-- In edge function context met SERVICE_ROLE_KEY is auth.uid() = NULL, dus
-- user_has_location_access(NULL, ...) = false → guard blokkeert ALLES.
--
-- Impact pre-fix:
--  * check-availability (sectie 1.2): is_location_open returned altijd false
--    → engine zag locatie altijd als gesloten → lege slots → reserveringen geblokkeerd
--  * ai-respond (sectie 2): schedule14d altijd leeg, isOpenNow altijd false
--    → Gemini kreeg lege OPENINGSTIJDEN-sectie
--  * (Sectie 3 zou ook altijd suppressor-mode geven)
--
-- FIX: service-role-aware guard. Pattern in lijn met `reorder_shifts` (defense
-- in depth voor user contexts) maar omgekeerde semantiek: NULL = service role
-- = bypass toegestaan.
--
-- Service-role context (auth.uid() IS NULL) bypasses access check.
-- Service role has inherent full access via RLS-bypass, so the guard
-- is only meaningful in end-user contexts (browser-JWT auth).
--
-- Andere 7 RPCs met dit guard-patroon (count_segment_customers, get_bookable_tickets,
-- get_effective_shift_schedule, get_next_ticket_sort_order, get_shift_ticket_config,
-- get_ticket_with_policy, list_segment_customers) worden NIET vanuit edge functions
-- aangeroepen en blijven dus ongewijzigd (audit: grep in supabase/functions/).

-- ============================================================================
-- 1. is_location_open
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_location_open(
  _location_id uuid,
  _at timestamp with time zone DEFAULT now(),
  _service text DEFAULT 'general'::text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _tz text;
  _local_date date;
  _local_time time;
  _dow int;
  _exc record;
  _has_hit boolean;
BEGIN
  -- Service-role context (auth.uid() IS NULL) bypasses access check.
  -- Service role has inherent full access via RLS-bypass, so the guard
  -- is only meaningful in end-user contexts (browser-JWT auth).
  IF auth.uid() IS NOT NULL AND NOT public.user_has_location_access(auth.uid(), _location_id) THEN
    RETURN false;
  END IF;

  SELECT COALESCE(timezone, 'Europe/Amsterdam') INTO _tz
  FROM locations WHERE id = _location_id;

  IF _tz IS NULL THEN
    RETURN false;
  END IF;

  _local_date := (_at AT TIME ZONE _tz)::date;
  _local_time := (_at AT TIME ZONE _tz)::time;
  _dow := EXTRACT(ISODOW FROM _local_date)::int;

  -- Exception eerst (specifieke service > general fallback)
  SELECT * INTO _exc
  FROM location_operating_exceptions
  WHERE location_id = _location_id
    AND exception_date = _local_date
    AND service_type IN (_service, 'general')
  ORDER BY (service_type = _service) DESC, created_at DESC
  LIMIT 1;

  IF FOUND THEN
    IF _exc.exception_type = 'closed' THEN
      RETURN false;
    END IF;
    RETURN _local_time >= _exc.open_time AND _local_time < _exc.close_time;
  END IF;

  -- Reguliere uren
  SELECT true INTO _has_hit
  FROM location_operating_hours
  WHERE location_id = _location_id
    AND day_of_week = _dow
    AND service_type IN (_service, 'general')
    AND _local_time >= open_time
    AND _local_time < close_time
  LIMIT 1;

  RETURN COALESCE(_has_hit, false);
END $function$;

-- ============================================================================
-- 2. get_operating_schedule
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_operating_schedule(
  _location_id uuid,
  _from date,
  _to date,
  _service text DEFAULT NULL::text
)
RETURNS TABLE(date date, service_type text, open_time time without time zone, close_time time without time zone, is_closed boolean, label text, source text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Service-role context (auth.uid() IS NULL) bypasses access check.
  -- Service role has inherent full access via RLS-bypass, so the guard
  -- is only meaningful in end-user contexts (browser-JWT auth).
  IF auth.uid() IS NOT NULL AND NOT public.user_has_location_access(auth.uid(), _location_id) THEN
    RETURN;
  END IF;

  IF (_to - _from) > 400 THEN
    RAISE EXCEPTION 'range too large (max 400 days)';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT d::date AS date
    FROM generate_series(_from, _to, interval '1 day') d
  ),
  exc AS (
    SELECT
      e.exception_date AS date,
      e.service_type,
      e.open_time,
      e.close_time,
      (e.exception_type = 'closed') AS is_closed,
      e.label,
      'exception'::text AS source
    FROM location_operating_exceptions e
    WHERE e.location_id = _location_id
      AND e.exception_date BETWEEN _from AND _to
      AND (_service IS NULL OR e.service_type = _service)
  ),
  reg AS (
    SELECT
      d.date,
      h.service_type,
      h.open_time,
      h.close_time,
      false AS is_closed,
      NULL::text AS label,
      'regular'::text AS source
    FROM days d
    JOIN location_operating_hours h
      ON h.location_id = _location_id
     AND h.day_of_week = EXTRACT(ISODOW FROM d.date)::int
     AND (_service IS NULL OR h.service_type = _service)
    WHERE NOT EXISTS (
      SELECT 1 FROM exc x
      WHERE x.date = d.date AND x.service_type = h.service_type
    )
  )
  SELECT * FROM exc
  UNION ALL
  SELECT * FROM reg
  ORDER BY 1, 2, 3;
END $function$;

-- ============================================================================
-- 3. get_operating_hours (single-day, gebruikt door useLocationOpenStatus hook)
-- Niet gebroken in productie (alleen browser-callers), maar mee-gepatched voor
-- consistentie en toekomstige edge-function-gebruik.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_operating_hours(
  _location_id uuid,
  _date date,
  _service text DEFAULT 'general'::text
)
RETURNS TABLE(open_time time without time zone, close_time time without time zone, exception_type text, label text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _dow int;
  _has_exc boolean;
BEGIN
  -- Service-role context (auth.uid() IS NULL) bypasses access check.
  -- Service role has inherent full access via RLS-bypass, so the guard
  -- is only meaningful in end-user contexts (browser-JWT auth).
  IF auth.uid() IS NOT NULL AND NOT public.user_has_location_access(auth.uid(), _location_id) THEN
    RETURN;
  END IF;

  _dow := EXTRACT(ISODOW FROM _date)::int;

  SELECT EXISTS(
    SELECT 1 FROM location_operating_exceptions
    WHERE location_id = _location_id
      AND exception_date = _date
      AND service_type = _service
  ) INTO _has_exc;

  IF _has_exc THEN
    RETURN QUERY
    SELECT e.open_time, e.close_time, e.exception_type::text, e.label
    FROM location_operating_exceptions e
    WHERE e.location_id = _location_id
      AND e.exception_date = _date
      AND e.service_type = _service
      AND e.exception_type <> 'closed';
    RETURN;
  END IF;

  RETURN QUERY
  SELECT h.open_time, h.close_time, NULL::text, NULL::text
  FROM location_operating_hours h
  WHERE h.location_id = _location_id
    AND h.day_of_week = _dow
    AND h.service_type = _service
  ORDER BY h.sort_order, h.open_time;
END $function$;