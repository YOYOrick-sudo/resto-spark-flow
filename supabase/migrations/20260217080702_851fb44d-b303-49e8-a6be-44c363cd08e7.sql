
-- =============================================
-- Fase 4.7b: Database Migration
-- =============================================

-- 1A. customer_id nullable + FK ON DELETE SET NULL
ALTER TABLE public.reservations DROP CONSTRAINT reservations_customer_id_fkey;
ALTER TABLE public.reservations ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

-- 1B. actor_type on audit_log
ALTER TABLE public.audit_log ADD COLUMN actor_type TEXT NOT NULL DEFAULT 'user';

-- 1C. Fix fn_calculate_no_show_risk to handle NULL customer_id + add BEFORE INSERT trigger
CREATE OR REPLACE FUNCTION public.fn_calculate_no_show_risk()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _score NUMERIC(5,2) := 0;
  _noshow_rate NUMERIC;
  _lead_days INTEGER;
  _dow INTEGER;
  _total_visits INTEGER;
  _total_no_shows INTEGER;
  _guest_score NUMERIC(5,2) := 0;
  _party_score NUMERIC(5,2) := 0;
  _lead_score NUMERIC(5,2) := 0;
  _chan_score NUMERIC(5,2) := 0;
  _day_score NUMERIC(5,2) := 0;
  _guest_detail TEXT;
  _party_detail TEXT;
  _lead_detail TEXT;
  _chan_detail TEXT;
  _day_detail TEXT;
BEGIN
  -- Get customer stats (handle NULL customer_id for walk-ins)
  IF NEW.customer_id IS NOT NULL THEN
    SELECT c.total_visits, c.total_no_shows
    INTO _total_visits, _total_no_shows
    FROM public.customers c WHERE c.id = NEW.customer_id;
  END IF;

  -- Factor 1: Guest history
  IF NEW.customer_id IS NULL OR NOT FOUND THEN
    -- Walk-in or unknown customer: default moderate score
    _guest_score := 6;
    _guest_detail := 'Onbekende gast / walk-in';
  ELSIF _total_visits > 0 THEN
    _noshow_rate := _total_no_shows::NUMERIC / _total_visits;
    _guest_score := LEAST(_noshow_rate * 40, 40);
    _guest_detail := _total_no_shows || ' no-shows van ' || _total_visits || ' bezoeken';
  ELSE
    _guest_score := 6;
    _guest_detail := 'Nieuwe gast';
  END IF;

  -- Factor 2: Party size
  IF NEW.party_size >= 7 THEN _party_score := 20;
  ELSIF NEW.party_size >= 5 THEN _party_score := 12;
  ELSIF NEW.party_size >= 3 THEN _party_score := 6;
  ELSE _party_score := 2;
  END IF;
  _party_detail := NEW.party_size || ' personen';

  -- Factor 3: Lead time
  _lead_days := NEW.reservation_date - CURRENT_DATE;
  IF _lead_days > 30 THEN _lead_score := 20;
  ELSIF _lead_days >= 15 THEN _lead_score := 15;
  ELSIF _lead_days >= 8 THEN _lead_score := 10;
  ELSIF _lead_days >= 2 THEN _lead_score := 4;
  ELSE _lead_score := 1;
  END IF;
  _lead_detail := _lead_days || ' dagen van tevoren';

  -- Factor 4: Channel
  CASE NEW.channel
    WHEN 'walk_in'   THEN _chan_score := 0;
    WHEN 'phone'     THEN _chan_score := 1;
    WHEN 'operator'  THEN _chan_score := 2;
    WHEN 'whatsapp'  THEN _chan_score := 3;
    WHEN 'widget'    THEN _chan_score := 6;
    WHEN 'google'    THEN _chan_score := 10;
    ELSE _chan_score := 0;
  END CASE;
  _chan_detail := NEW.channel::text;

  -- Factor 5: Day of the week
  _dow := EXTRACT(ISODOW FROM NEW.reservation_date);
  CASE
    WHEN _dow = 6 THEN _day_score := 10;
    WHEN _dow = 5 THEN _day_score := 5;
    WHEN _dow = 7 THEN _day_score := 4;
    ELSE _day_score := 2;
  END CASE;
  _day_detail := trim(to_char(NEW.reservation_date, 'Day'));

  _score := _guest_score + _party_score + _lead_score + _chan_score + _day_score;

  NEW.no_show_risk_score := LEAST(_score, 100);
  NEW.risk_factors := jsonb_build_object(
    'guest_history', jsonb_build_object('score', _guest_score, 'weight', 40, 'detail', _guest_detail),
    'party_size',    jsonb_build_object('score', _party_score, 'weight', 20, 'detail', _party_detail),
    'booking_lead',  jsonb_build_object('score', _lead_score,  'weight', 20, 'detail', _lead_detail),
    'channel',       jsonb_build_object('score', _chan_score,   'weight', 10, 'detail', _chan_detail),
    'day_of_week',   jsonb_build_object('score', _day_score,   'weight', 10, 'detail', _day_detail)
  );

  RETURN NEW;
END;
$function$;

-- Add the missing BEFORE INSERT trigger
CREATE TRIGGER trg_calculate_risk_on_insert
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION fn_calculate_no_show_risk();

-- 1D. create_reservation RPC — customer_id optional
CREATE OR REPLACE FUNCTION public.create_reservation(
  _location_id uuid,
  _customer_id uuid DEFAULT NULL,
  _shift_id uuid DEFAULT NULL,
  _ticket_id uuid DEFAULT NULL,
  _reservation_date date DEFAULT NULL,
  _start_time time without time zone DEFAULT NULL,
  _party_size integer DEFAULT NULL,
  _channel reservation_channel DEFAULT 'operator'::reservation_channel,
  _table_id uuid DEFAULT NULL,
  _guest_notes text DEFAULT NULL,
  _internal_notes text DEFAULT NULL,
  _initial_status reservation_status DEFAULT 'confirmed'::reservation_status,
  _squeeze boolean DEFAULT false,
  _actor_id uuid DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _reservation_id UUID;
  _duration INTEGER;
  _end_time TIME;
  _st RECORD;
  _t RECORD;
  _effective_actor UUID;
BEGIN
  -- Validate required fields
  IF _shift_id IS NULL THEN RAISE EXCEPTION 'shift_id is required'; END IF;
  IF _ticket_id IS NULL THEN RAISE EXCEPTION 'ticket_id is required'; END IF;
  IF _reservation_date IS NULL THEN RAISE EXCEPTION 'reservation_date is required'; END IF;
  IF _start_time IS NULL THEN RAISE EXCEPTION 'start_time is required'; END IF;
  IF _party_size IS NULL THEN RAISE EXCEPTION 'party_size is required'; END IF;

  _effective_actor := COALESCE(_actor_id, auth.uid());

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
    _party_size, _duration, _squeeze, _guest_notes, _internal_notes, _effective_actor
  ) RETURNING id INTO _reservation_id;

  INSERT INTO public.audit_log (location_id, entity_type, entity_id, action, actor_id, changes)
  VALUES (
    _location_id, 'reservation', _reservation_id, 'created', _effective_actor,
    jsonb_build_object(
      'status', _initial_status::text, 'channel', _channel::text,
      'party_size', _party_size, 'date', _reservation_date::text,
      'start_time', _start_time::text, 'end_time', _end_time::text, 'squeeze', _squeeze
    )
  );

  RETURN _reservation_id;
END;
$function$;

-- 1E. transition_reservation_status — override + beveiliging
CREATE OR REPLACE FUNCTION public.transition_reservation_status(
  _reservation_id uuid,
  _new_status reservation_status,
  _actor_id uuid DEFAULT NULL,
  _reason text DEFAULT NULL,
  _is_override boolean DEFAULT false
)
 RETURNS uuid
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
    -- Override: permission check — must be manager or owner
    IF NOT user_has_role_in_location(_effective_actor, _r.location_id, ARRAY['owner','manager']::location_role[]) THEN
      RAISE EXCEPTION 'Override requires manager or owner role';
    END IF;
    -- Override: reason is mandatory
    IF _reason IS NULL OR trim(_reason) = '' THEN
      RAISE EXCEPTION 'Reason is required for override transitions';
    END IF;
    -- Override allows any transition from non-terminal states (already guarded above)
    _allowed := true;
    _metadata := jsonb_build_object('reason', _reason, 'is_override', true);
  ELSE
    -- Normal transition matrix
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

  UPDATE public.reservations SET status = _new_status WHERE id = _reservation_id;

  INSERT INTO public.audit_log (location_id, entity_type, entity_id, action, actor_id, changes, metadata)
  VALUES (
    _r.location_id, 'reservation', _reservation_id, 'status_change', _effective_actor,
    jsonb_build_object('old_status', _r.status::text, 'new_status', _new_status::text),
    _metadata
  );

  RETURN _reservation_id;
END;
$function$;
