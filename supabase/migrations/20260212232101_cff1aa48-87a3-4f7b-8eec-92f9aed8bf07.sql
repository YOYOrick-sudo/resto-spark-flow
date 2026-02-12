
-- ============================================
-- Fase 4.4: Squeeze defaults op tickets tabel
-- ============================================

-- 1. Voeg squeeze default kolommen toe aan tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS squeeze_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS squeeze_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS squeeze_gap_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS squeeze_to_fixed_end_time time,
  ADD COLUMN IF NOT EXISTS squeeze_limit_per_shift integer;

-- 2. Update get_shift_ticket_config RPC met COALESCE voor squeeze defaults
CREATE OR REPLACE FUNCTION public.get_shift_ticket_config(_shift_id uuid, _ticket_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _result JSONB;
  _location_id UUID;
BEGIN
  SELECT location_id INTO _location_id FROM public.shifts WHERE id = _shift_id;
  
  IF _location_id IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;
  
  IF NOT public.user_has_location_access(auth.uid(), _location_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'shift_id', s.id,
    'ticket_id', t.id,
    'ticket_name', t.name,
    'display_title', t.display_title,
    'duration_minutes', COALESCE(st.override_duration_minutes, t.duration_minutes),
    'buffer_minutes', COALESCE(st.override_buffer_minutes, t.buffer_minutes),
    'min_party_size', COALESCE(st.override_min_party, t.min_party_size),
    'max_party_size', COALESCE(st.override_max_party, t.max_party_size),
    'pacing_limit', st.pacing_limit,
    'seating_limit_guests', st.seating_limit_guests,
    'seating_limit_reservations', st.seating_limit_reservations,
    'ignore_pacing', COALESCE(st.ignore_pacing, false),
    'areas', st.areas,
    'show_area_name', COALESCE(st.show_area_name, false),
    'area_display_names', st.area_display_names,
    'squeeze_enabled', COALESCE(st.squeeze_enabled, t.squeeze_enabled, false),
    'squeeze_duration_minutes', COALESCE(st.squeeze_duration_minutes, t.squeeze_duration_minutes),
    'squeeze_gap_minutes', COALESCE(st.squeeze_gap_minutes, t.squeeze_gap_minutes, 0),
    'squeeze_to_fixed_end_time', COALESCE(st.squeeze_to_fixed_end_time, t.squeeze_to_fixed_end_time),
    'squeeze_limit_per_shift', COALESCE(st.squeeze_limit_per_shift, t.squeeze_limit_per_shift),
    'show_end_time', COALESCE(st.show_end_time, false),
    'waitlist_enabled', COALESCE(st.waitlist_enabled, false),
    'channel_permissions', COALESCE(st.channel_permissions, '{"widget":true,"phone":true}'::jsonb),
    'policy_set_id', t.policy_set_id
  ) INTO _result
  FROM public.tickets t
  INNER JOIN public.shift_tickets st ON st.ticket_id = t.id AND st.shift_id = _shift_id
  INNER JOIN public.shifts s ON s.id = st.shift_id
  WHERE t.id = _ticket_id;

  IF _result IS NULL THEN
    RAISE EXCEPTION 'Shift-ticket combination not found';
  END IF;

  RETURN _result;
END;
$function$;
