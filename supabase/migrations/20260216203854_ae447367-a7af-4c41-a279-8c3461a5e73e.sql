
-- ============================================
-- FASE 4.6: Reservation Model + Status Machine + AI Feature 1
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE public.reservation_status AS ENUM (
  'pending',
  'confirmed',
  'option',
  'pending_payment',
  'seated',
  'completed',
  'no_show',
  'cancelled'
);

CREATE TYPE public.reservation_channel AS ENUM (
  'widget',
  'operator',
  'phone',
  'google',
  'whatsapp',
  'walk_in'
);

-- ============================================
-- CUSTOMERS TABLE
-- ============================================

CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  language TEXT NOT NULL DEFAULT 'nl',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_no_shows INTEGER NOT NULL DEFAULT 0,
  total_cancellations INTEGER NOT NULL DEFAULT 0,
  first_visit_at TIMESTAMPTZ,
  last_visit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_customers_location_email
  ON public.customers (location_id, email)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX idx_customers_location_phone
  ON public.customers (location_id, phone_number)
  WHERE phone_number IS NOT NULL;

CREATE INDEX idx_customers_name_trgm
  ON public.customers
  USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.fn_validate_customer_contact()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NULL AND NEW.phone_number IS NULL THEN
    RAISE EXCEPTION 'Customer must have at least an email or phone number';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_customer_contact
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_customer_contact();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select"
  ON public.customers FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));

CREATE POLICY "customers_all"
  ON public.customers FOR ALL
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role, 'service'::location_role]));

-- ============================================
-- RESERVATIONS TABLE
-- ============================================

CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE RESTRICT,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE RESTRICT,
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  status public.reservation_status NOT NULL DEFAULT 'pending',
  channel public.reservation_channel NOT NULL DEFAULT 'operator',
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  party_size INTEGER NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_squeeze BOOLEAN NOT NULL DEFAULT false,
  guest_notes TEXT,
  internal_notes TEXT,
  manage_token UUID NOT NULL DEFAULT gen_random_uuid(),
  no_show_risk_score NUMERIC(5,2) DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservations_location_date
  ON public.reservations (location_id, reservation_date);

CREATE INDEX idx_reservations_customer
  ON public.reservations (customer_id);

CREATE INDEX idx_reservations_shift_date
  ON public.reservations (shift_id, reservation_date);

CREATE INDEX idx_reservations_status
  ON public.reservations (status);

CREATE UNIQUE INDEX idx_reservations_manage_token
  ON public.reservations (manage_token);

CREATE INDEX idx_reservations_table_date
  ON public.reservations (table_id, reservation_date)
  WHERE table_id IS NOT NULL;

CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_select"
  ON public.reservations FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));

CREATE POLICY "reservations_all"
  ON public.reservations FOR ALL
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role, 'service'::location_role]));

-- ============================================
-- AUDIT LOG TABLE
-- ============================================

CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_entity
  ON public.audit_log (entity_type, entity_id);

CREATE INDEX idx_audit_log_location
  ON public.audit_log (location_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select"
  ON public.audit_log FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_no_show_risk(_reservation_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  _score NUMERIC(5,2) := 0;
  _r RECORD;
  _noshow_rate NUMERIC;
BEGIN
  SELECT r.*, c.total_visits, c.total_no_shows, c.total_cancellations
  INTO _r
  FROM public.reservations r
  JOIN public.customers c ON c.id = r.customer_id
  WHERE r.id = _reservation_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  -- Factor 1: Customer history (40%)
  IF _r.total_visits > 0 THEN
    _noshow_rate := _r.total_no_shows::NUMERIC / _r.total_visits;
    _score := _score + (_noshow_rate * 40);
  ELSIF _r.total_visits = 0 THEN
    _score := _score + 10;
  END IF;

  -- Factor 2: Party size (20%)
  IF _r.party_size >= 8 THEN _score := _score + 20;
  ELSIF _r.party_size >= 6 THEN _score := _score + 14;
  ELSIF _r.party_size >= 4 THEN _score := _score + 8;
  END IF;

  -- Factor 3: Channel (20%)
  IF _r.channel = 'widget' THEN _score := _score + 12;
  ELSIF _r.channel = 'google' THEN _score := _score + 14;
  ELSIF _r.channel = 'phone' THEN _score := _score + 4;
  ELSIF _r.channel = 'operator' THEN _score := _score + 2;
  ELSIF _r.channel = 'walk_in' THEN _score := _score + 0;
  END IF;

  -- Factor 4: Advance booking days (10%)
  IF _r.reservation_date - CURRENT_DATE > 14 THEN _score := _score + 10;
  ELSIF _r.reservation_date - CURRENT_DATE > 7 THEN _score := _score + 6;
  ELSIF _r.reservation_date - CURRENT_DATE > 3 THEN _score := _score + 3;
  END IF;

  -- Factor 5: Cancellation history (10%)
  IF _r.total_visits > 0 THEN
    _score := _score + LEAST((_r.total_cancellations::NUMERIC / _r.total_visits) * 10, 10);
  END IF;

  RETURN LEAST(_score, 100);
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public;

-- transition_reservation_status
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
    WHEN 'pending' THEN _new_status IN ('confirmed', 'cancelled', 'pending_payment')
    WHEN 'confirmed' THEN _new_status IN ('seated', 'cancelled', 'no_show', 'option')
    WHEN 'option' THEN _new_status IN ('confirmed', 'cancelled', 'pending_payment')
    WHEN 'pending_payment' THEN _new_status IN ('confirmed', 'cancelled')
    WHEN 'seated' THEN _new_status IN ('completed', 'no_show')
    WHEN 'completed' THEN false
    WHEN 'no_show' THEN _new_status IN ('confirmed')
    WHEN 'cancelled' THEN _new_status IN ('confirmed')
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

-- create_reservation
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
  IF _initial_status NOT IN ('pending', 'confirmed', 'option', 'pending_payment') THEN
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

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.fn_update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.customers
    SET total_visits = total_visits + 1, first_visit_at = COALESCE(first_visit_at, now()), last_visit_at = now()
    WHERE id = NEW.customer_id;
  END IF;

  IF NEW.status = 'no_show' AND OLD.status != 'no_show' THEN
    UPDATE public.customers SET total_no_shows = total_no_shows + 1 WHERE id = NEW.customer_id;
  END IF;

  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.customers SET total_cancellations = total_cancellations + 1 WHERE id = NEW.customer_id;
  END IF;

  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    UPDATE public.customers SET total_visits = GREATEST(total_visits - 1, 0) WHERE id = NEW.customer_id;
  END IF;

  IF OLD.status = 'no_show' AND NEW.status != 'no_show' THEN
    UPDATE public.customers SET total_no_shows = GREATEST(total_no_shows - 1, 0) WHERE id = NEW.customer_id;
  END IF;

  IF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
    UPDATE public.customers SET total_cancellations = GREATEST(total_cancellations - 1, 0) WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_update_customer_stats
  AFTER UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_customer_stats();

CREATE OR REPLACE FUNCTION public.fn_calculate_no_show_risk()
RETURNS TRIGGER AS $$
BEGIN
  NEW.no_show_risk_score := public.calculate_no_show_risk(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_calculate_no_show_risk_insert
  BEFORE INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.fn_calculate_no_show_risk();

CREATE TRIGGER trg_calculate_no_show_risk_update
  BEFORE UPDATE OF customer_id, party_size, channel, reservation_date
  ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.fn_calculate_no_show_risk();

CREATE OR REPLACE FUNCTION public.fn_audit_reservation_update()
RETURNS TRIGGER AS $$
DECLARE
  _changes JSONB := '{}'::jsonb;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  IF NEW.table_id IS DISTINCT FROM OLD.table_id THEN
    _changes := _changes || jsonb_build_object('table_id', jsonb_build_object('old', OLD.table_id, 'new', NEW.table_id));
  END IF;
  IF NEW.party_size IS DISTINCT FROM OLD.party_size THEN
    _changes := _changes || jsonb_build_object('party_size', jsonb_build_object('old', OLD.party_size, 'new', NEW.party_size));
  END IF;
  IF NEW.start_time IS DISTINCT FROM OLD.start_time THEN
    _changes := _changes || jsonb_build_object('start_time', jsonb_build_object('old', OLD.start_time::text, 'new', NEW.start_time::text));
  END IF;
  IF NEW.end_time IS DISTINCT FROM OLD.end_time THEN
    _changes := _changes || jsonb_build_object('end_time', jsonb_build_object('old', OLD.end_time::text, 'new', NEW.end_time::text));
  END IF;
  IF NEW.reservation_date IS DISTINCT FROM OLD.reservation_date THEN
    _changes := _changes || jsonb_build_object('reservation_date', jsonb_build_object('old', OLD.reservation_date::text, 'new', NEW.reservation_date::text));
  END IF;
  IF NEW.guest_notes IS DISTINCT FROM OLD.guest_notes THEN
    _changes := _changes || jsonb_build_object('guest_notes', jsonb_build_object('old', OLD.guest_notes, 'new', NEW.guest_notes));
  END IF;
  IF NEW.internal_notes IS DISTINCT FROM OLD.internal_notes THEN
    _changes := _changes || jsonb_build_object('internal_notes', jsonb_build_object('old', OLD.internal_notes, 'new', NEW.internal_notes));
  END IF;

  IF _changes != '{}'::jsonb THEN
    INSERT INTO public.audit_log (location_id, entity_type, entity_id, action, changes)
    VALUES (NEW.location_id, 'reservation', NEW.id, 'field_update', _changes);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_audit_reservation_update
  AFTER UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_reservation_update();

-- ============================================
-- VIEW: shift_risk_summary
-- ============================================

CREATE OR REPLACE VIEW public.shift_risk_summary AS
SELECT
  r.location_id,
  r.shift_id,
  r.reservation_date,
  COUNT(*) AS total_reservations,
  SUM(r.party_size) AS total_covers,
  ROUND(AVG(r.no_show_risk_score), 1) AS avg_risk_score,
  COUNT(*) FILTER (WHERE r.no_show_risk_score >= 50) AS high_risk_count,
  SUM(r.party_size) FILTER (WHERE r.no_show_risk_score >= 50) AS high_risk_covers
FROM public.reservations r
WHERE r.status IN ('confirmed', 'option', 'pending_payment')
GROUP BY r.location_id, r.shift_id, r.reservation_date;
