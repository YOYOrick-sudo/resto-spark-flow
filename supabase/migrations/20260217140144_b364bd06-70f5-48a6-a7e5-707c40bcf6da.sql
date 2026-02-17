
-- =============================================
-- Fase 4.9: Options (Optie Reserveringen)
-- =============================================

-- 1A. Nieuwe kolommen op reservation_settings
ALTER TABLE public.reservation_settings
  ADD COLUMN IF NOT EXISTS options_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS option_default_expiry_hours INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS option_auto_release BOOLEAN NOT NULL DEFAULT true;

-- 1B. Nieuwe kolommen op reservations
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS option_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 1C. Partial index voor option expiry candidates
CREATE INDEX IF NOT EXISTS idx_reservations_option_expiry
  ON reservations (option_expires_at)
  WHERE status = 'option' AND option_expires_at IS NOT NULL;

-- 1B2. Update fn_update_customer_stats trigger
-- Correcte kolomnamen: total_cancellations, total_no_shows
CREATE OR REPLACE FUNCTION fn_update_customer_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Alleen doorgaan als status daadwerkelijk is veranderd
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;

  -- INCREMENT bij nieuwe status
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.customers SET
      total_visits = total_visits + 1,
      first_visit_at = COALESCE(first_visit_at, NOW()),
      last_visit_at = NOW()
    WHERE id = NEW.customer_id;
  ELSIF NEW.status = 'no_show' AND OLD.status != 'no_show' THEN
    UPDATE public.customers SET
      total_no_shows = total_no_shows + 1
    WHERE id = NEW.customer_id;
  ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled'
    AND (NEW.cancellation_reason IS NULL
         OR NEW.cancellation_reason IN ('guest', 'operator')) THEN
    -- option_expired telt NIET mee
    UPDATE public.customers SET
      total_cancellations = total_cancellations + 1
    WHERE id = NEW.customer_id;
  END IF;

  -- DECREMENT bij override van vorige status
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    UPDATE public.customers SET
      total_visits = GREATEST(total_visits - 1, 0)
    WHERE id = NEW.customer_id;
  ELSIF OLD.status = 'no_show' AND NEW.status != 'no_show' THEN
    UPDATE public.customers SET
      total_no_shows = GREATEST(total_no_shows - 1, 0)
    WHERE id = NEW.customer_id;
  ELSIF OLD.status = 'cancelled' AND NEW.status != 'cancelled'
    AND (OLD.cancellation_reason IS NULL
         OR OLD.cancellation_reason IN ('guest', 'operator')) THEN
    UPDATE public.customers SET
      total_cancellations = GREATEST(total_cancellations - 1, 0)
    WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END; $$;

-- 1D. fn_auto_release_options
CREATE OR REPLACE FUNCTION fn_auto_release_options()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _count INTEGER := 0; _r RECORD;
BEGIN
  FOR _r IN
    SELECT r.id, r.location_id, r.option_expires_at
    FROM reservations r
    JOIN reservation_settings rs ON rs.location_id = r.location_id
    WHERE r.status = 'option'
      AND rs.option_auto_release = true
      AND r.option_expires_at IS NOT NULL
      AND r.option_expires_at < NOW()
  LOOP
    UPDATE reservations
    SET status = 'cancelled',
        cancellation_reason = 'option_expired',
        updated_at = NOW()
    WHERE id = _r.id AND status = 'option';

    INSERT INTO audit_log (
      entity_type, entity_id, location_id,
      action, actor_id, actor_type,
      changes, metadata
    ) VALUES (
      'reservation', _r.id, _r.location_id,
      'status_change', NULL, 'system',
      jsonb_build_object('old_status', 'option', 'new_status', 'cancelled'),
      jsonb_build_object('reason', 'Optie automatisch verlopen')
    );

    _count := _count + 1;
  END LOOP;
  RETURN _count;
END; $$;

-- 1E. pg_cron job
SELECT cron.schedule('auto-release-options', '* * * * *',
  $$SELECT fn_auto_release_options()$$);

-- 1F. extend_option RPC
CREATE OR REPLACE FUNCTION extend_option(
  _reservation_id UUID,
  _extra_hours INTEGER DEFAULT 24,
  _actor_id UUID DEFAULT NULL
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _r reservations%ROWTYPE;
  _actor UUID := COALESCE(_actor_id, auth.uid());
  _new_expiry TIMESTAMPTZ;
BEGIN
  SELECT * INTO _r FROM reservations WHERE id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservering niet gevonden'; END IF;
  IF _r.status <> 'option' THEN
    RAISE EXCEPTION 'Alleen opties kunnen verlengd worden';
  END IF;

  _new_expiry := COALESCE(_r.option_expires_at, NOW()) + (_extra_hours || ' hours')::INTERVAL;

  UPDATE reservations
  SET option_expires_at = _new_expiry, updated_at = NOW()
  WHERE id = _reservation_id;

  INSERT INTO audit_log (
    entity_type, entity_id, location_id,
    action, actor_id, actor_type,
    changes, metadata
  ) VALUES (
    'reservation', _reservation_id, _r.location_id,
    'option_extended', _actor, 'user',
    jsonb_build_object(
      'old_expires_at', _r.option_expires_at::text,
      'new_expires_at', _new_expiry::text
    ),
    jsonb_build_object('extra_hours', _extra_hours)
  );

  RETURN _new_expiry;
END; $$;

-- 1G. Update transition_reservation_status (with _is_override)
-- Drop old overloads first
DROP FUNCTION IF EXISTS public.transition_reservation_status(uuid, reservation_status, uuid, text);
DROP FUNCTION IF EXISTS public.transition_reservation_status(uuid, reservation_status, uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.transition_reservation_status(
  _reservation_id uuid,
  _new_status reservation_status,
  _actor_id uuid DEFAULT NULL,
  _reason text DEFAULT NULL,
  _is_override boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      WHEN 'seated'           THEN _new_status IN ('completed')
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
$$;

-- 1H. Update create_reservation RPC
-- Add option_expires_at logic when creating with status 'option'
DROP FUNCTION IF EXISTS public.create_reservation(uuid, uuid, uuid, uuid, date, time, integer, reservation_channel, uuid, text, text, reservation_status, boolean, uuid);

CREATE OR REPLACE FUNCTION public.create_reservation(
  _location_id uuid,
  _customer_id uuid DEFAULT NULL,
  _shift_id uuid DEFAULT NULL,
  _ticket_id uuid DEFAULT NULL,
  _reservation_date date DEFAULT NULL,
  _start_time time DEFAULT NULL,
  _party_size integer DEFAULT NULL,
  _channel reservation_channel DEFAULT 'operator',
  _table_id uuid DEFAULT NULL,
  _guest_notes text DEFAULT NULL,
  _internal_notes text DEFAULT NULL,
  _initial_status reservation_status DEFAULT 'confirmed',
  _squeeze boolean DEFAULT false,
  _actor_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _reservation_id UUID;
  _duration INTEGER;
  _end_time TIME;
  _st RECORD;
  _t RECORD;
  _effective_actor UUID;
  _expiry_hours INTEGER;
BEGIN
  -- Validate required fields
  IF _shift_id IS NULL THEN RAISE EXCEPTION 'shift_id is required'; END IF;
  IF _ticket_id IS NULL THEN RAISE EXCEPTION 'ticket_id is required'; END IF;
  IF _reservation_date IS NULL THEN RAISE EXCEPTION 'reservation_date is required'; END IF;
  IF _start_time IS NULL THEN RAISE EXCEPTION 'start_time is required'; END IF;
  IF _party_size IS NULL THEN RAISE EXCEPTION 'party_size is required'; END IF;

  _effective_actor := COALESCE(_actor_id, auth.uid());

  -- Walk-in must start as seated
  IF _channel = 'walk_in' THEN
    IF _initial_status != 'seated' THEN
      RAISE EXCEPTION 'Walk-in reservations must have status seated, got: %', _initial_status;
    END IF;
  ELSIF _initial_status NOT IN ('draft', 'confirmed', 'option', 'pending_payment') THEN
    RAISE EXCEPTION 'Invalid initial status: %', _initial_status;
  END IF;

  SELECT * INTO _t FROM public.tickets WHERE id = _ticket_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket not found: %', _ticket_id; END IF;

  SELECT * INTO _st FROM public.shift_tickets
  WHERE shift_id = _shift_id AND ticket_id = _ticket_id AND is_active = true;

  IF _squeeze THEN
    _duration := COALESCE(_st.squeeze_duration_minutes, _t.squeeze_duration_minutes, _t.duration_minutes);
  ELSE
    _duration := COALESCE(_st.override_duration_minutes, _t.duration_minutes);
  END IF;

  _end_time := _start_time + (_duration || ' minutes')::interval;

  INSERT INTO public.reservations (
    location_id, customer_id, shift_id, ticket_id, table_id,
    status, channel, reservation_date, start_time, end_time,
    party_size, duration_minutes, is_squeeze, guest_notes, internal_notes, created_by
  ) VALUES (
    _location_id, _customer_id, _shift_id, _ticket_id, _table_id,
    _initial_status, _channel, _reservation_date, _start_time, _end_time,
    _party_size, _duration, _squeeze, _guest_notes, _internal_notes, _effective_actor
  ) RETURNING id INTO _reservation_id;

  -- Set option_expires_at when created as option
  IF _initial_status = 'option' THEN
    SELECT option_default_expiry_hours INTO _expiry_hours
    FROM reservation_settings WHERE location_id = _location_id;

    UPDATE reservations SET
      option_expires_at = NOW() + (COALESCE(_expiry_hours, 24) || ' hours')::INTERVAL
    WHERE id = _reservation_id;
  END IF;

  INSERT INTO public.audit_log (location_id, entity_type, entity_id, action, actor_id, actor_type, changes)
  VALUES (
    _location_id, 'reservation', _reservation_id, 'created', _effective_actor, 'user',
    jsonb_build_object(
      'status', _initial_status::text, 'channel', _channel::text,
      'party_size', _party_size, 'date', _reservation_date::text,
      'start_time', _start_time::text, 'end_time', _end_time::text, 'squeeze', _squeeze
    )
  );

  RETURN _reservation_id;
END;
$$;
