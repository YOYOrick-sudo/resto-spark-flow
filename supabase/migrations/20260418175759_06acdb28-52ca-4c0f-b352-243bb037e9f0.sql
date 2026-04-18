-- ============================================================================
-- FASE A1 — Operating Hours foundation
-- ============================================================================

-- 1. Enum
DO $$ BEGIN
  CREATE TYPE public.operating_exception_type AS ENUM ('closed', 'modified', 'extra');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Reguliere week
CREATE TABLE IF NOT EXISTS public.location_operating_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  service_type text NOT NULL DEFAULT 'general',
  open_time time NOT NULL,
  close_time time NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (close_time > open_time)
);
CREATE INDEX IF NOT EXISTS idx_loh_lookup
  ON public.location_operating_hours (location_id, day_of_week, service_type);

-- 3. Datum-uitzonderingen
CREATE TABLE IF NOT EXISTS public.location_operating_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  service_type text NOT NULL DEFAULT 'general',
  exception_type public.operating_exception_type NOT NULL,
  open_time time,
  close_time time,
  label text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loe_lookup
  ON public.location_operating_exceptions (location_id, exception_date, service_type);

-- 4. Validatie-trigger voor exceptions (geen CHECK met functies, dat is immutable-onvriendelijk)
CREATE OR REPLACE FUNCTION public.validate_operating_exception()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.exception_type IN ('modified','extra') THEN
    IF NEW.open_time IS NULL OR NEW.close_time IS NULL THEN
      RAISE EXCEPTION 'modified/extra requires open_time and close_time';
    END IF;
    IF NEW.close_time <= NEW.open_time THEN
      RAISE EXCEPTION 'close_time must be after open_time';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_operating_exception ON public.location_operating_exceptions;
CREATE TRIGGER trg_validate_operating_exception
BEFORE INSERT OR UPDATE ON public.location_operating_exceptions
FOR EACH ROW EXECUTE FUNCTION public.validate_operating_exception();

-- 5. updated_at trigger op location_operating_hours
DROP TRIGGER IF EXISTS trg_loh_updated ON public.location_operating_hours;
CREATE TRIGGER trg_loh_updated
BEFORE UPDATE ON public.location_operating_hours
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. RLS
-- ============================================================================
ALTER TABLE public.location_operating_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_operating_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loh_read"  ON public.location_operating_hours;
DROP POLICY IF EXISTS "loh_write" ON public.location_operating_hours;
DROP POLICY IF EXISTS "loe_read"  ON public.location_operating_exceptions;
DROP POLICY IF EXISTS "loe_write" ON public.location_operating_exceptions;

CREATE POLICY "loh_read"
ON public.location_operating_hours FOR SELECT
USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "loh_write"
ON public.location_operating_hours FOR ALL
USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]))
WITH CHECK (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

CREATE POLICY "loe_read"
ON public.location_operating_exceptions FOR SELECT
USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "loe_write"
ON public.location_operating_exceptions FOR ALL
USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]))
WITH CHECK (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

-- ============================================================================
-- 7. RPCs
-- ============================================================================

-- 7a. is_location_open
CREATE OR REPLACE FUNCTION public.is_location_open(
  _location_id uuid,
  _at timestamptz DEFAULT now(),
  _service text DEFAULT 'general'
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tz text;
  _local_date date;
  _local_time time;
  _dow int;
  _exc record;
  _has_hit boolean;
BEGIN
  IF NOT public.user_has_location_access(auth.uid(), _location_id) THEN
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
END $$;

-- 7b. get_operating_hours
CREATE OR REPLACE FUNCTION public.get_operating_hours(
  _location_id uuid,
  _date date,
  _service text DEFAULT 'general'
) RETURNS TABLE (
  open_time time,
  close_time time,
  exception_type text,
  label text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dow int;
  _has_exc boolean;
BEGIN
  IF NOT public.user_has_location_access(auth.uid(), _location_id) THEN
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
END $$;

-- 7c. get_operating_schedule
CREATE OR REPLACE FUNCTION public.get_operating_schedule(
  _location_id uuid,
  _from date,
  _to date,
  _service text DEFAULT NULL
) RETURNS TABLE (
  date date,
  service_type text,
  open_time time,
  close_time time,
  is_closed boolean,
  label text,
  source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.user_has_location_access(auth.uid(), _location_id) THEN
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
END $$;

-- ============================================================================
-- 8. Seed defaults — ma-zo 09:00-23:00, service 'general'
-- ============================================================================
INSERT INTO public.location_operating_hours (location_id, day_of_week, service_type, open_time, close_time)
SELECT l.id, dow, 'general', '09:00'::time, '23:00'::time
FROM public.locations l
CROSS JOIN generate_series(1, 7) AS dow
WHERE NOT EXISTS (
  SELECT 1 FROM public.location_operating_hours x
  WHERE x.location_id = l.id
    AND x.day_of_week = dow
    AND x.service_type = 'general'
);