
CREATE OR REPLACE FUNCTION public.transition_reservation_status(
  _reservation_id UUID,
  _new_status reservation_status,
  _actor_id UUID DEFAULT NULL,
  _reason TEXT DEFAULT NULL,
  _is_override BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _r RECORD;
  _allowed BOOLEAN := false;
  _effective_actor UUID;
  _metadata JSONB := '{}'::jsonb;
  _terminal_statuses reservation_status[] := ARRAY['completed', 'no_show', 'cancelled']::reservation_status[];
  _checkin_window INTEGER;
  _move_to_now BOOLEAN;
  _tz TEXT;
  _original_start TIME;
  _expiry_hours INTEGER;
BEGIN
  _effective_actor := COALESCE(_actor_id, auth.uid());

  SELECT * INTO _r FROM public.reservations WHERE id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found: %', _reservation_id;
  END IF;

  -- Terminal states can NEVER be a source, even with override
  IF _r.status = ANY(_terminal_statuses) THEN
    RAISE EXCEPTION 'Cannot transition from terminal status: %', _r.status;
  END IF;

  IF _is_override THEN
    IF NOT user_has_role_in_location(_effective_actor, _r.location_id, ARRAY['owner','manager']::location_role[]) THEN
      RAISE EXCEPTION 'Override requires manager or owner role';
    END IF;
    IF _reason IS NULL OR trim(_reason) = '' THEN
      RAISE EXCEPTION 'Reason is required for override transitions';
    END IF;
    _allowed := true;
    _metadata := jsonb_build_object('reason', _reason, 'is_override', true);
  ELSE
    _allowed := CASE _r.status
      WHEN 'draft'           THEN _new_status IN ('confirmed', 'cancelled', 'pending_payment', 'option')
      WHEN 'pending_payment'  THEN _new_status IN ('confirmed', 'cancelled')
      WHEN 'option'           THEN _new_status IN ('confirmed', 'cancelled')
      WHEN 'confirmed'        THEN _new_status IN ('seated', 'cancelled', 'no_show')
      WHEN 'seated'           THEN _new_status IN ('completed', 'confirmed')
      ELSE false
    END;
    IF _reason IS NOT NULL THEN
      _metadata := jsonb_build_object('reason', _reason);
    END IF;
  END IF;

  IF NOT _allowed THEN
    RAISE EXCEPTION 'Invalid status transition: % → %', _r.status, _new_status;
  END IF;

  -- Get timezone for this location
  SELECT timezone INTO _tz FROM locations WHERE id = _r.location_id;
  _tz := COALESCE(_tz, 'Europe/Amsterdam');

  -- Status-specific logic
  IF _new_status = 'seated' THEN
    -- Check-in window validation (skip for override)
    IF NOT _is_override THEN
      SELECT checkin_window_minutes INTO _checkin_window
      FROM reservation_settings WHERE location_id = _r.location_id;

      _checkin_window := COALESCE(_checkin_window, 15);

      IF (NOW() AT TIME ZONE _tz)
         < (_r.reservation_date + _r.start_time
            - (_checkin_window || ' minutes')::INTERVAL) THEN
        RAISE EXCEPTION 'Te vroeg om in te checken. Reservering begint om %', _r.start_time;
      END IF;
    END IF;

    -- Move-to-now logic
    SELECT move_to_now_on_checkin INTO _move_to_now
    FROM reservation_settings WHERE location_id = _r.location_id;

    IF COALESCE(_move_to_now, false) THEN
      _original_start := _r.start_time;
      UPDATE public.reservations SET
        status = _new_status,
        checked_in_at = NOW(),
        start_time = (NOW() AT TIME ZONE _tz)::TIME,
        updated_at = NOW()
      WHERE id = _reservation_id;
      _metadata := _metadata || jsonb_build_object(
        'move_to_now', true,
        'original_start_time', _original_start::text
      );
    ELSE
      UPDATE public.reservations SET
        status = _new_status,
        checked_in_at = NOW(),
        updated_at = NOW()
      WHERE id = _reservation_id;
    END IF;

  ELSIF _new_status = 'confirmed' AND _r.status = 'seated' THEN
    -- Undo check-in: wis checked_in_at + herstel originele starttijd als move-to-now was toegepast
    SELECT (metadata->>'original_start_time')::TIME INTO _original_start
    FROM public.audit_log
    WHERE entity_id = _reservation_id
      AND action = 'status_change'
      AND changes->>'new_status' = 'seated'
    ORDER BY created_at DESC LIMIT 1;

    UPDATE public.reservations SET
      status = 'confirmed',
      checked_in_at = NULL,
      start_time = COALESCE(_original_start, start_time),
      updated_at = NOW()
    WHERE id = _reservation_id;

  ELSIF _new_status = 'option' THEN
    -- Zet option_expires_at bij draft → option
    SELECT option_default_expiry_hours INTO _expiry_hours
    FROM reservation_settings WHERE location_id = _r.location_id;

    UPDATE public.reservations SET
      status = _new_status,
      option_expires_at = NOW() + (COALESCE(_expiry_hours, 24) || ' hours')::INTERVAL,
      updated_at = NOW()
    WHERE id = _reservation_id;

  ELSIF _new_status = 'confirmed' AND _r.status = 'option' THEN
    -- Wis option_expires_at bij option → confirmed
    UPDATE public.reservations SET
      status = _new_status,
      option_expires_at = NULL,
      updated_at = NOW()
    WHERE id = _reservation_id;

  ELSIF _new_status = 'cancelled' THEN
    -- Zet cancellation_reason bij handmatige annulering
    UPDATE public.reservations SET
      status = _new_status,
      cancellation_reason = 'operator',
      updated_at = NOW()
    WHERE id = _reservation_id;

  ELSE
    UPDATE public.reservations SET
      status = _new_status,
      updated_at = NOW()
    WHERE id = _reservation_id;
  END IF;

  -- Audit log
  INSERT INTO public.audit_log (location_id, entity_type, entity_id, action, actor_id, actor_type, changes, metadata)
  VALUES (
    _r.location_id, 'reservation', _reservation_id, 'status_change', _effective_actor, 'user',
    jsonb_build_object('old_status', _r.status::text, 'new_status', _new_status::text),
    _metadata
  );

  RETURN _reservation_id;
END;
$function$;
