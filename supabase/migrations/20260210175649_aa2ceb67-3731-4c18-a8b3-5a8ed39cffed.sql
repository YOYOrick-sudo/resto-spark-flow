
-- ============================================
-- FASE 4.4A: Tickets & Beleid — Database Fundament
-- Lees eerst docs/FASE_4_4_TICKETS.md voor het volledige concept
-- Migration volgorde: policy_sets → tickets → shift_tickets → triggers → RLS → RPCs → seed
-- ============================================

-- ============================================
-- 1. POLICY_SETS TABEL
-- ============================================

CREATE TABLE public.policy_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Payment
  payment_type TEXT NOT NULL DEFAULT 'none'
    CHECK (payment_type IN ('none', 'deposit', 'full_prepay', 'no_show_guarantee')),
  payment_amount_cents INTEGER,
  show_full_price BOOLEAN NOT NULL DEFAULT false,
  full_price_cents INTEGER,
  show_discount_price BOOLEAN NOT NULL DEFAULT false,
  discount_original_cents INTEGER,
  absorb_transaction_fee BOOLEAN NOT NULL DEFAULT true,
  
  -- Cancellation
  cancel_policy_type TEXT NOT NULL DEFAULT 'free'
    CHECK (cancel_policy_type IN ('free', 'window', 'no_cancel')),
  cancel_window_hours INTEGER,
  cancel_cutoff_time TIME,
  refund_type TEXT NOT NULL DEFAULT 'full'
    CHECK (refund_type IN ('full', 'partial', 'none')),
  refund_percentage INTEGER,
  
  -- No-show
  noshow_policy_type TEXT NOT NULL DEFAULT 'none'
    CHECK (noshow_policy_type IN ('none', 'mark_only', 'charge')),
  noshow_mark_after_minutes INTEGER DEFAULT 15,
  noshow_charge_amount_cents INTEGER,
  
  -- Reconfirmation
  reconfirm_enabled BOOLEAN NOT NULL DEFAULT false,
  reconfirm_hours_before INTEGER,
  reconfirm_required BOOLEAN NOT NULL DEFAULT false,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Cross-field validations via CHECK (cleaner than triggers for simple rules)
  CHECK (payment_type = 'none' OR payment_amount_cents IS NOT NULL),
  CHECK (cancel_policy_type != 'window' OR cancel_window_hours IS NOT NULL)
);

CREATE INDEX idx_policy_sets_location ON public.policy_sets(location_id);

-- ============================================
-- 2. TICKETS TABEL
-- ============================================

CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id),
  policy_set_id UUID REFERENCES public.policy_sets(id) ON DELETE RESTRICT,
  
  name TEXT NOT NULL,
  display_title TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  image_url TEXT,
  color TEXT NOT NULL DEFAULT '#0d9488',
  
  ticket_type TEXT NOT NULL DEFAULT 'regular'
    CHECK (ticket_type IN ('regular', 'default', 'event')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('active', 'draft', 'archived')),
  
  is_highlighted BOOLEAN NOT NULL DEFAULT false,
  highlight_order INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  min_party_size INTEGER NOT NULL DEFAULT 1,
  max_party_size INTEGER NOT NULL DEFAULT 20,
  duration_minutes INTEGER NOT NULL DEFAULT 90,
  buffer_minutes INTEGER NOT NULL DEFAULT 15,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  booking_window_min_minutes INTEGER,
  booking_window_max_days INTEGER DEFAULT 365,
  large_party_threshold INTEGER,
  large_party_min_minutes INTEGER,
  
  friend_url_token TEXT DEFAULT gen_random_uuid()::text,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(location_id, name)
);

-- Max 1 default ticket per location
CREATE UNIQUE INDEX idx_tickets_single_default 
  ON public.tickets(location_id) 
  WHERE is_default = true;

-- display_title case-insensitive unique per location (active tickets only)
CREATE UNIQUE INDEX idx_tickets_display_title_unique 
  ON public.tickets(location_id, lower(display_title)) 
  WHERE status = 'active';

CREATE INDEX idx_tickets_location ON public.tickets(location_id);
CREATE INDEX idx_tickets_location_status ON public.tickets(location_id, status);

-- ============================================
-- 3. SHIFT_TICKETS TABEL
-- ============================================

CREATE TABLE public.shift_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id),
  
  -- Override velden (nullable = terugval op ticket defaults)
  override_duration_minutes INTEGER,
  override_buffer_minutes INTEGER,
  override_min_party INTEGER,
  override_max_party INTEGER,
  
  -- Capacity
  pacing_limit INTEGER,
  seating_limit_guests INTEGER,
  seating_limit_reservations INTEGER,
  ignore_pacing BOOLEAN NOT NULL DEFAULT false,
  
  -- Area restrictions
  areas UUID[],
  show_area_name BOOLEAN NOT NULL DEFAULT false,
  area_display_names JSONB,
  
  -- Squeeze
  squeeze_enabled BOOLEAN NOT NULL DEFAULT false,
  squeeze_duration_minutes INTEGER,
  squeeze_gap_minutes INTEGER,
  squeeze_to_fixed_end_time TIME,
  squeeze_limit_per_shift INTEGER,
  
  -- Display
  show_end_time BOOLEAN NOT NULL DEFAULT false,
  
  -- Waitlist
  waitlist_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Channels
  channel_permissions JSONB NOT NULL DEFAULT '{"widget":true,"phone":true}'::jsonb,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(shift_id, ticket_id)
);

CREATE INDEX idx_shift_tickets_shift ON public.shift_tickets(shift_id);
CREATE INDEX idx_shift_tickets_ticket ON public.shift_tickets(ticket_id);
CREATE INDEX idx_shift_tickets_location ON public.shift_tickets(location_id);

-- ============================================
-- 4. TRIGGERS
-- ============================================

-- 4a. updated_at triggers
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_policy_sets_updated_at
  BEFORE UPDATE ON public.policy_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4b. Enforce single default ticket per location
CREATE OR REPLACE FUNCTION public.enforce_single_default_ticket()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.tickets
    SET is_default = false
    WHERE location_id = NEW.location_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE TRIGGER trg_enforce_single_default_ticket
  BEFORE INSERT OR UPDATE OF is_default ON public.tickets
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.enforce_single_default_ticket();

-- 4c. Sync location_id on shift_tickets from shifts (denormalisatie voor RLS)
CREATE OR REPLACE FUNCTION public.sync_shift_ticket_location()
RETURNS TRIGGER AS $$
BEGIN
  SELECT location_id INTO NEW.location_id
  FROM public.shifts
  WHERE id = NEW.shift_id;
  
  IF NEW.location_id IS NULL THEN
    RAISE EXCEPTION 'Shift % not found', NEW.shift_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE TRIGGER trg_sync_shift_ticket_location
  BEFORE INSERT OR UPDATE OF shift_id ON public.shift_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_shift_ticket_location();

-- 4d. Auto-create default ticket + policy_set for new locations
-- Named to sort AFTER existing on_location_created trigger
CREATE OR REPLACE FUNCTION public.auto_create_default_ticket()
RETURNS TRIGGER AS $$
DECLARE
  _policy_id UUID;
  _ticket_id UUID;
BEGIN
  -- Create default policy set
  INSERT INTO public.policy_sets (
    location_id, name, description,
    payment_type, cancel_policy_type, noshow_policy_type,
    noshow_mark_after_minutes, is_active
  ) VALUES (
    NEW.id, 'Standaard', 'Standaard beleid — geen betaling, gratis annuleren',
    'none', 'free', 'mark_only',
    15, true
  ) RETURNING id INTO _policy_id;
  
  -- Create default ticket
  INSERT INTO public.tickets (
    location_id, policy_set_id, name, display_title,
    ticket_type, is_default, status, sort_order, is_active
  ) VALUES (
    NEW.id, _policy_id, 'Reservering', 'Reservering',
    'default', true, 'active', 10, true
  ) RETURNING id INTO _ticket_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = 'public';

CREATE TRIGGER trg_auto_create_default_ticket
  AFTER INSERT ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_default_ticket();

-- ============================================
-- 5. RLS POLICIES
-- ============================================

ALTER TABLE public.policy_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_tickets ENABLE ROW LEVEL SECURITY;

-- policy_sets
CREATE POLICY "policy_sets_select" ON public.policy_sets
  FOR SELECT USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "policy_sets_insert" ON public.policy_sets
  FOR INSERT WITH CHECK (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::public.location_role[]));

CREATE POLICY "policy_sets_update" ON public.policy_sets
  FOR UPDATE USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::public.location_role[]));

CREATE POLICY "policy_sets_delete" ON public.policy_sets
  FOR DELETE USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::public.location_role[]));

-- tickets
CREATE POLICY "tickets_select" ON public.tickets
  FOR SELECT USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT WITH CHECK (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::public.location_role[]));

CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::public.location_role[]));

CREATE POLICY "tickets_delete" ON public.tickets
  FOR DELETE USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::public.location_role[]));

-- shift_tickets (RLS werkt direct dankzij gedenormaliseerde location_id)
CREATE POLICY "shift_tickets_select" ON public.shift_tickets
  FOR SELECT USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "shift_tickets_insert" ON public.shift_tickets
  FOR INSERT WITH CHECK (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::public.location_role[]));

CREATE POLICY "shift_tickets_update" ON public.shift_tickets
  FOR UPDATE USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::public.location_role[]));

CREATE POLICY "shift_tickets_delete" ON public.shift_tickets
  FOR DELETE USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::public.location_role[]));

-- ============================================
-- 6. RPCs
-- ============================================

-- 6a. get_bookable_tickets: tickets boekbaar op een specifieke datum
CREATE OR REPLACE FUNCTION public.get_bookable_tickets(
  _location_id UUID,
  _date DATE
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  display_title TEXT,
  description TEXT,
  short_description TEXT,
  image_url TEXT,
  color TEXT,
  ticket_type TEXT,
  is_default BOOLEAN,
  is_highlighted BOOLEAN,
  highlight_order INTEGER,
  sort_order INTEGER,
  min_party_size INTEGER,
  max_party_size INTEGER,
  duration_minutes INTEGER,
  buffer_minutes INTEGER,
  policy_set_id UUID,
  friend_url_token TEXT,
  tags JSONB,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _dow INTEGER;
  _location_closed BOOLEAN;
BEGIN
  -- Auth check
  IF NOT public.user_has_location_access(auth.uid(), _location_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  _dow := extract(isodow FROM _date)::integer;

  -- Check location-wide closed exception
  SELECT EXISTS (
    SELECT 1 FROM public.shift_exceptions se
    WHERE se.location_id = _location_id
      AND se.shift_id IS NULL
      AND se.exception_date = _date
      AND se.exception_type = 'closed'
  ) INTO _location_closed;

  IF _location_closed THEN
    RETURN; -- lege set
  END IF;

  -- Return tickets met minstens één actieve, draaiende shift op deze datum
  RETURN QUERY
  SELECT DISTINCT ON (t.id)
    t.id, t.name, t.display_title, t.description, t.short_description,
    t.image_url, t.color, t.ticket_type, t.is_default, t.is_highlighted,
    t.highlight_order, t.sort_order, t.min_party_size, t.max_party_size,
    t.duration_minutes, t.buffer_minutes, t.policy_set_id,
    t.friend_url_token, t.tags, t.metadata
  FROM public.tickets t
  INNER JOIN public.shift_tickets st ON st.ticket_id = t.id AND st.is_active = true
  INNER JOIN public.shifts s ON s.id = st.shift_id AND s.is_active = true
  WHERE t.location_id = _location_id
    AND t.status = 'active'
    AND t.is_active = true
    AND _dow = ANY(s.days_of_week)
    AND NOT EXISTS (
      SELECT 1 FROM public.shift_exceptions se
      WHERE se.shift_id = s.id
        AND se.exception_date = _date
        AND se.exception_type = 'closed'
    )
  ORDER BY t.id;
END;
$$;

-- 6b. get_ticket_with_policy: ticket + joined policy_set
CREATE OR REPLACE FUNCTION public.get_ticket_with_policy(_ticket_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _result JSONB;
  _location_id UUID;
BEGIN
  SELECT location_id INTO _location_id FROM public.tickets WHERE id = _ticket_id;
  
  IF _location_id IS NULL THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;
  
  IF NOT public.user_has_location_access(auth.uid(), _location_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'ticket', row_to_json(t.*),
    'policy_set', CASE WHEN ps.id IS NOT NULL THEN row_to_json(ps.*) ELSE NULL END
  ) INTO _result
  FROM public.tickets t
  LEFT JOIN public.policy_sets ps ON ps.id = t.policy_set_id
  WHERE t.id = _ticket_id;

  RETURN _result;
END;
$$;

-- 6c. get_shift_ticket_config: effectieve config met COALESCE merge
CREATE OR REPLACE FUNCTION public.get_shift_ticket_config(
  _shift_id UUID,
  _ticket_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
    'squeeze_enabled', COALESCE(st.squeeze_enabled, false),
    'squeeze_duration_minutes', st.squeeze_duration_minutes,
    'squeeze_gap_minutes', st.squeeze_gap_minutes,
    'squeeze_to_fixed_end_time', st.squeeze_to_fixed_end_time,
    'squeeze_limit_per_shift', st.squeeze_limit_per_shift,
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
$$;

-- 6d. get_next_ticket_sort_order
CREATE OR REPLACE FUNCTION public.get_next_ticket_sort_order(_location_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _next INTEGER;
BEGIN
  IF NOT public.user_has_location_access(auth.uid(), _location_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(MAX(sort_order), 0) + 10 INTO _next
  FROM public.tickets
  WHERE location_id = _location_id;

  RETURN _next;
END;
$$;

-- 6e. reorder_tickets: atomaire reorder (zelfde patroon als reorder_areas)
CREATE OR REPLACE FUNCTION public.reorder_tickets(
  _location_id UUID,
  _ticket_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _active_count INTEGER;
  _input_count INTEGER;
  _valid_count INTEGER;
  _current_order UUID[];
  _proposed_order UUID[];
BEGIN
  -- Guard: empty/null array
  IF _ticket_ids IS NULL OR array_length(_ticket_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Empty ticket list');
  END IF;

  -- Auth check
  IF NOT public.user_has_role_in_location(
    auth.uid(), _location_id, ARRAY['owner','manager']::public.location_role[]
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Concurrency lock
  PERFORM pg_advisory_xact_lock(hashtext('reorder_tickets_' || _location_id::text));

  _input_count := array_length(_ticket_ids, 1);

  -- No duplicate IDs
  SELECT count(DISTINCT u) INTO _valid_count FROM unnest(_ticket_ids) u;
  IF _valid_count != _input_count THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Duplicate ticket IDs');
  END IF;

  -- All active tickets count
  SELECT count(*) INTO _active_count
  FROM public.tickets
  WHERE location_id = _location_id AND is_active = true;

  IF _input_count != _active_count THEN
    RETURN jsonb_build_object('success', false, 'reason', 
      format('Expected %s active tickets, got %s', _active_count, _input_count));
  END IF;

  -- All IDs must be active tickets of this location
  SELECT count(*) INTO _valid_count
  FROM public.tickets
  WHERE id = ANY(_ticket_ids) AND location_id = _location_id AND is_active = true;

  IF _valid_count != _input_count THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Invalid ticket IDs');
  END IF;

  -- Idempotency check
  SELECT array_agg(id ORDER BY sort_order, id) INTO _current_order
  FROM public.tickets
  WHERE location_id = _location_id AND is_active = true;

  _proposed_order := _ticket_ids;

  IF _current_order = _proposed_order THEN
    RETURN jsonb_build_object('success', true, 'changed', false, 'count', _input_count);
  END IF;

  -- Atomic update via UNNEST WITH ORDINALITY
  UPDATE public.tickets t
  SET sort_order = (o.ordinality - 1) * 10 + 10
  FROM unnest(_ticket_ids) WITH ORDINALITY AS o(ticket_id, ordinality)
  WHERE t.id = o.ticket_id;

  RETURN jsonb_build_object('success', true, 'changed', true, 'count', _input_count);
END;
$$;

-- ============================================
-- 7. SEED DATA voor bestaande test-locatie
-- ============================================

DO $$
DECLARE
  _loc_id UUID := '22222222-2222-2222-2222-222222222222';
  _policy_id UUID;
  _loc_exists BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.locations WHERE id = _loc_id) INTO _loc_exists;
  
  IF NOT _loc_exists THEN
    RETURN; -- Skip als locatie niet bestaat
  END IF;
  
  -- Check of er al een default ticket is
  IF EXISTS (SELECT 1 FROM public.tickets WHERE location_id = _loc_id AND is_default = true) THEN
    RETURN; -- Skip als seed data al bestaat
  END IF;
  
  -- Create default policy set
  INSERT INTO public.policy_sets (
    location_id, name, description,
    payment_type, cancel_policy_type, noshow_policy_type,
    noshow_mark_after_minutes, is_active
  ) VALUES (
    _loc_id, 'Standaard', 'Standaard beleid — geen betaling, gratis annuleren',
    'none', 'free', 'mark_only',
    15, true
  ) RETURNING id INTO _policy_id;
  
  -- Create default ticket
  INSERT INTO public.tickets (
    location_id, policy_set_id, name, display_title,
    ticket_type, is_default, status, sort_order, is_active
  ) VALUES (
    _loc_id, _policy_id, 'Reservering', 'Reservering',
    'default', true, 'active', 10, true
  );
END;
$$;
