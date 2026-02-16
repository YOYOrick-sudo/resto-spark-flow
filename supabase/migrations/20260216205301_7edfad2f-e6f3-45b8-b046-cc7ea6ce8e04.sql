
-- ============================================
-- Fase 4.6 Correctieve Migratie: 5 Fixes + View Enhancement
-- ============================================

-- FIX 1: Rename enum value pending → draft
ALTER TYPE public.reservation_status RENAME VALUE 'pending' TO 'draft';
ALTER TABLE public.reservations ALTER COLUMN status SET DEFAULT 'draft'::reservation_status;

-- FIX 2: Corrected transition matrix (terminal states, no seated→no_show)
CREATE OR REPLACE FUNCTION public.transition_reservation_status(
  _reservation_id UUID,
  _new_status reservation_status,
  _actor_id UUID DEFAULT NULL,
  _reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  _r RECORD;
  _allowed BOOLEAN := false;
BEGIN
  SELECT * INTO _r FROM public.reservations WHERE id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found: %', _reservation_id;
  END IF;

  _allowed := CASE _r.status
    WHEN 'draft'           THEN _new_status IN ('confirmed', 'cancelled', 'pending_payment', 'option')
    WHEN 'pending_payment'  THEN _new_status IN ('confirmed', 'cancelled')
    WHEN 'option'           THEN _new_status IN ('confirmed', 'cancelled')
    WHEN 'confirmed'        THEN _new_status IN ('seated', 'cancelled', 'no_show')
    WHEN 'seated'           THEN _new_status IN ('completed')
    WHEN 'completed'        THEN false
    WHEN 'no_show'          THEN false
    WHEN 'cancelled'        THEN false
    ELSE false
  END;

  IF NOT _allowed THEN
    RAISE EXCEPTION 'Invalid status transition: % → %', _r.status, _new_status;
  END IF;

  UPDATE public.reservations SET status = _new_status WHERE id = _reservation_id;

  INSERT INTO public.audit_log (location_id, entity_type, entity_id, action, actor_id, changes, metadata)
  VALUES (
    _r.location_id, 'reservation', _reservation_id, 'status_change', _actor_id,
    jsonb_build_object('old_status', _r.status::text, 'new_status', _new_status::text),
    CASE WHEN _reason IS NOT NULL THEN jsonb_build_object('reason', _reason) ELSE '{}'::jsonb END
  );

  RETURN _reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- FIX 3: Corrected risk score weights (40/20/20/10/10)
CREATE OR REPLACE FUNCTION public.calculate_no_show_risk(_reservation_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  _score NUMERIC(5,2) := 0;
  _r RECORD;
  _noshow_rate NUMERIC;
  _lead_days INTEGER;
  _dow INTEGER;
BEGIN
  SELECT r.*, c.total_visits, c.total_no_shows, c.total_cancellations
  INTO _r
  FROM public.reservations r
  JOIN public.customers c ON c.id = r.customer_id
  WHERE r.id = _reservation_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  -- Factor 1: Guest history — 40 pts max (40%)
  IF _r.total_visits > 0 THEN
    _noshow_rate := _r.total_no_shows::NUMERIC / _r.total_visits;
    _score := _score + LEAST(_noshow_rate * 40, 40);
  ELSE
    -- New guest: ~15% risk = 6 pts
    _score := _score + 6;
  END IF;

  -- Factor 2: Party size — 20 pts max (20%)
  IF _r.party_size >= 7 THEN _score := _score + 20;
  ELSIF _r.party_size >= 5 THEN _score := _score + 12;
  ELSIF _r.party_size >= 3 THEN _score := _score + 6;
  ELSE _score := _score + 2;
  END IF;

  -- Factor 3: Lead time — 20 pts max (20%)
  _lead_days := _r.reservation_date - CURRENT_DATE;
  IF _lead_days > 30 THEN _score := _score + 20;
  ELSIF _lead_days >= 15 THEN _score := _score + 15;
  ELSIF _lead_days >= 8 THEN _score := _score + 10;
  ELSIF _lead_days >= 2 THEN _score := _score + 4;
  ELSE _score := _score + 1;
  END IF;

  -- Factor 4: Channel — 10 pts max (10%)
  CASE _r.channel
    WHEN 'walk_in'   THEN _score := _score + 0;
    WHEN 'phone'     THEN _score := _score + 1;
    WHEN 'operator'  THEN _score := _score + 2;
    WHEN 'whatsapp'  THEN _score := _score + 3;
    WHEN 'widget'    THEN _score := _score + 6;
    WHEN 'google'    THEN _score := _score + 10;
    ELSE NULL;
  END CASE;

  -- Factor 5: Day of the week — 10 pts max (10%)
  _dow := EXTRACT(ISODOW FROM _r.reservation_date);
  CASE
    WHEN _dow = 6 THEN _score := _score + 10;  -- Za
    WHEN _dow = 5 THEN _score := _score + 5;   -- Vr
    WHEN _dow = 7 THEN _score := _score + 4;   -- Zo
    ELSE _score := _score + 2;                  -- Ma-Do
  END CASE;

  RETURN LEAST(_score, 100);
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public;

-- FIX 4: Walk-in exception in create_reservation
CREATE OR REPLACE FUNCTION public.create_reservation(
  _location_id UUID,
  _customer_id UUID,
  _shift_id UUID,
  _ticket_id UUID,
  _reservation_date DATE,
  _start_time TIME,
  _party_size INTEGER,
  _channel reservation_channel DEFAULT 'operator',
  _table_id UUID DEFAULT NULL,
  _guest_notes TEXT DEFAULT NULL,
  _internal_notes TEXT DEFAULT NULL,
  _initial_status reservation_status DEFAULT 'confirmed',
  _squeeze BOOLEAN DEFAULT false,
  _actor_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  _reservation_id UUID;
  _duration INTEGER;
  _end_time TIME;
  _st RECORD;
  _t RECORD;
BEGIN
  -- Walk-in must start as seated; all others validate against allowed initial statuses
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
    _party_size, _duration, _squeeze, _guest_notes, _internal_notes, _actor_id
  ) RETURNING id INTO _reservation_id;

  INSERT INTO public.audit_log (location_id, entity_type, entity_id, action, actor_id, changes)
  VALUES (
    _location_id, 'reservation', _reservation_id, 'created', _actor_id,
    jsonb_build_object(
      'status', _initial_status::text, 'channel', _channel::text,
      'party_size', _party_size, 'date', _reservation_date::text,
      'start_time', _start_time::text, 'end_time', _end_time::text, 'squeeze', _squeeze
    )
  );

  RETURN _reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- FIX 5: Drop BEFORE INSERT trigger, create AFTER INSERT trigger
DROP TRIGGER IF EXISTS trg_calculate_no_show_risk_insert ON public.reservations;

CREATE OR REPLACE FUNCTION public.fn_calculate_no_show_risk_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.reservations
  SET no_show_risk_score = public.calculate_no_show_risk(NEW.id)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_calculate_no_show_risk_after_insert
  AFTER INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.fn_calculate_no_show_risk_after_insert();

-- Keep existing BEFORE UPDATE trigger for recalculations on field changes
-- (it works fine for updates since the row already exists)

-- VIEW ENHANCEMENT: Add shift_name + suggested_overbook_covers
DROP VIEW IF EXISTS public.shift_risk_summary;

CREATE VIEW public.shift_risk_summary
WITH (security_invoker = true) AS
SELECT
  r.location_id,
  r.shift_id,
  s.name AS shift_name,
  r.reservation_date,
  COUNT(*) AS total_reservations,
  SUM(r.party_size) AS total_covers,
  ROUND(AVG(r.no_show_risk_score), 1) AS avg_risk_score,
  COUNT(*) FILTER (WHERE r.no_show_risk_score >= 50) AS high_risk_count,
  SUM(r.party_size) FILTER (WHERE r.no_show_risk_score >= 50) AS high_risk_covers,
  ROUND(SUM(r.no_show_risk_score / 100.0 * r.party_size)) AS suggested_overbook_covers
FROM public.reservations r
JOIN public.shifts s ON s.id = r.shift_id
WHERE r.status IN ('draft', 'confirmed', 'option', 'pending_payment')
GROUP BY r.location_id, r.shift_id, s.name, r.reservation_date;
