
-- =============================================================
-- Fase 4.8: Check-in/Seat Flow met Regels
-- =============================================================

-- 1A. Nieuwe kolommen op reservation_settings
ALTER TABLE public.reservation_settings
  ADD COLUMN checkin_window_minutes INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN no_show_after_minutes INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN auto_no_show_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN move_to_now_on_checkin BOOLEAN NOT NULL DEFAULT false;

-- 1B. checked_in_at op reservations
ALTER TABLE public.reservations
  ADD COLUMN checked_in_at TIMESTAMPTZ;

-- 1C. Partial index voor no-show candidates
CREATE INDEX idx_reservations_noshow_candidates
  ON reservations (reservation_date, status, start_time)
  WHERE status = 'confirmed';

-- 1D. fn_auto_mark_no_shows met timezone correctie
CREATE OR REPLACE FUNCTION fn_auto_mark_no_shows()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INTEGER := 0;
  _r RECORD;
BEGIN
  FOR _r IN
    SELECT r.id, r.location_id, r.start_time, r.reservation_date,
           rs.no_show_after_minutes
    FROM reservations r
    JOIN reservation_settings rs ON rs.location_id = r.location_id
    JOIN locations l ON l.id = r.location_id
    WHERE r.status = 'confirmed'
      AND rs.auto_no_show_enabled = true
      AND r.reservation_date <= CURRENT_DATE
      AND (r.reservation_date + r.start_time
           + (rs.no_show_after_minutes || ' minutes')::INTERVAL)
          < (NOW() AT TIME ZONE l.timezone)
  LOOP
    UPDATE reservations
    SET status = 'no_show', updated_at = NOW()
    WHERE id = _r.id AND status = 'confirmed';

    INSERT INTO audit_log (
      entity_type, entity_id, location_id,
      action, actor_id, actor_type,
      changes, metadata
    ) VALUES (
      'reservation', _r.id, _r.location_id,
      'status_change', NULL, 'system',
      jsonb_build_object('old_status', 'confirmed', 'new_status', 'no_show'),
      jsonb_build_object('reason',
        'Automatisch na ' || _r.no_show_after_minutes || ' minuten')
    );

    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

-- 1E. pg_cron job
SELECT cron.schedule(
  'auto-no-show',
  '* * * * *',
  $$SELECT fn_auto_mark_no_shows()$$
);

-- 1F. move_reservation_table RPC
CREATE OR REPLACE FUNCTION move_reservation_table(
  _reservation_id UUID,
  _new_table_id UUID,
  _actor_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r reservations%ROWTYPE;
  _actor UUID;
  _old_table_id UUID;
BEGIN
  _actor := COALESCE(_actor_id, auth.uid());

  SELECT * INTO _r FROM reservations WHERE id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservering niet gevonden';
  END IF;

  IF _r.status NOT IN ('seated', 'confirmed') THEN
    RAISE EXCEPTION 'Tafel wijzigen alleen bij seated of confirmed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM tables t
    JOIN areas a ON a.id = t.area_id
    WHERE t.id = _new_table_id
      AND a.location_id = _r.location_id
      AND t.is_active = true
  ) THEN
    RAISE EXCEPTION 'Tafel niet gevonden of niet actief';
  END IF;

  _old_table_id := _r.table_id;

  UPDATE reservations
  SET table_id = _new_table_id, updated_at = NOW()
  WHERE id = _reservation_id;

  INSERT INTO audit_log (
    entity_type, entity_id, location_id,
    action, actor_id, actor_type, changes, metadata
  ) VALUES (
    'reservation', _reservation_id, _r.location_id,
    'table_moved', _actor, 'user',
    jsonb_build_object('old_table_id', _old_table_id, 'new_table_id', _new_table_id),
    '{}'::jsonb
  );
END;
$$;

-- 1G. Update transition_reservation_status met check-in window, checked_in_at, move_to_now
CREATE OR REPLACE FUNCTION transition_reservation_status(
  _reservation_id UUID,
  _new_status reservation_status,
  _actor_id UUID DEFAULT NULL,
  _reason TEXT DEFAULT NULL,
  _is_override BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Seated-specific logic
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
  ELSE
    UPDATE public.reservations SET
      status = _new_status,
      updated_at = NOW()
    WHERE id = _reservation_id;
  END IF;

  -- Audit log
  INSERT INTO public.audit_log (location_id, entity_type, entity_id, action, actor_id, changes, metadata)
  VALUES (
    _r.location_id, 'reservation', _reservation_id, 'status_change', _effective_actor,
    jsonb_build_object('old_status', _r.status::text, 'new_status', _new_status::text),
    _metadata
  );

  RETURN _reservation_id;
END;
$$;
