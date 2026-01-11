-- ============================================
-- FASE 4.3.A: SHIFTS FOUNDATION
-- Enterprise-grade foundation for shift management
-- ============================================

-- 1. ENUM TYPE
CREATE TYPE shift_exception_type AS ENUM ('closed', 'modified', 'special');

-- 2. SHIFTS TABLE
CREATE TABLE public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',
  arrival_interval_minutes INTEGER NOT NULL DEFAULT 15
    CHECK (arrival_interval_minutes IN (15, 30, 60)),
  color TEXT NOT NULL DEFAULT '#1d979e',
  
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT shifts_valid_time CHECK (start_time < end_time),
  CONSTRAINT shifts_short_name_length CHECK (char_length(short_name) <= 4)
);

-- Partial unique index: one active shift name per location (case-insensitive)
CREATE UNIQUE INDEX shifts_location_name_active_unique
ON public.shifts (location_id, LOWER(name))
WHERE is_active = true;

-- Index for location queries
CREATE INDEX shifts_location_id_idx ON public.shifts(location_id);
CREATE INDEX shifts_location_active_idx ON public.shifts(location_id) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. SHIFT EXCEPTIONS TABLE
CREATE TABLE public.shift_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  exception_type shift_exception_type NOT NULL,
  override_start_time TIME,
  override_end_time TIME,
  label TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT shift_exceptions_unique UNIQUE (location_id, shift_id, exception_date),
  CONSTRAINT shift_exceptions_modified_times CHECK (
    exception_type != 'modified'
    OR (
      override_start_time IS NOT NULL 
      AND override_end_time IS NOT NULL 
      AND override_start_time < override_end_time
    )
  )
);

-- Index for date range queries
CREATE INDEX shift_exceptions_location_date_idx 
ON public.shift_exceptions(location_id, exception_date);

-- 4. RLS POLICIES

-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_exceptions ENABLE ROW LEVEL SECURITY;

-- SHIFTS policies
CREATE POLICY "Users can view shifts for their locations"
ON public.shifts FOR SELECT
USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "Owners and managers can insert shifts"
ON public.shifts FOR INSERT
WITH CHECK (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

CREATE POLICY "Owners and managers can update shifts"
ON public.shifts FOR UPDATE
USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

CREATE POLICY "Owners and managers can delete shifts"
ON public.shifts FOR DELETE
USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

-- SHIFT_EXCEPTIONS policies
CREATE POLICY "Users can view shift exceptions for their locations"
ON public.shift_exceptions FOR SELECT
USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "Owners and managers can insert shift exceptions"
ON public.shift_exceptions FOR INSERT
WITH CHECK (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

CREATE POLICY "Owners and managers can update shift exceptions"
ON public.shift_exceptions FOR UPDATE
USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

CREATE POLICY "Owners and managers can delete shift exceptions"
ON public.shift_exceptions FOR DELETE
USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

-- 5. CORE RPC: get_effective_shift_schedule
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
    e.label AS exception_label
  FROM public.shifts s
  LEFT JOIN public.shift_exceptions e
    ON e.shift_id = s.id
    AND e.exception_date = _date
  WHERE s.location_id = _location_id
    AND s.is_active = true
    AND _dow = ANY(s.days_of_week)
    AND (e.exception_type IS NULL OR e.exception_type != 'closed')
  ORDER BY s.sort_order, s.start_time;
END;
$$;