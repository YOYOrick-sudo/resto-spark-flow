
-- ============================================
-- Fase 4.4B Stap 0: Drop is_active van tickets, gebruik alleen status
-- ============================================

-- 1. Drop is_active kolom
ALTER TABLE public.tickets DROP COLUMN IF EXISTS is_active;

-- 2. Update get_bookable_tickets: is_active → status = 'active'
CREATE OR REPLACE FUNCTION public.get_bookable_tickets(_location_id uuid, _date date)
RETURNS TABLE(id uuid, name text, display_title text, description text, short_description text, image_url text, color text, ticket_type text, is_default boolean, is_highlighted boolean, highlight_order integer, sort_order integer, min_party_size integer, max_party_size integer, duration_minutes integer, buffer_minutes integer, policy_set_id uuid, friend_url_token text, tags jsonb, metadata jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _dow INTEGER;
  _location_closed BOOLEAN;
BEGIN
  IF NOT public.user_has_location_access(auth.uid(), _location_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  _dow := extract(isodow FROM _date)::integer;

  SELECT EXISTS (
    SELECT 1 FROM public.shift_exceptions se
    WHERE se.location_id = _location_id
      AND se.shift_id IS NULL
      AND se.exception_date = _date
      AND se.exception_type = 'closed'
  ) INTO _location_closed;

  IF _location_closed THEN
    RETURN;
  END IF;

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
    AND _dow = ANY(s.days_of_week)
    AND NOT EXISTS (
      SELECT 1 FROM public.shift_exceptions se
      WHERE se.shift_id = s.id
        AND se.exception_date = _date
        AND se.exception_type = 'closed'
    )
  ORDER BY t.id;
END;
$function$;

-- 3. Update reorder_tickets: is_active → status = 'active'
CREATE OR REPLACE FUNCTION public.reorder_tickets(_location_id uuid, _ticket_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _active_count INTEGER;
  _input_count INTEGER;
  _valid_count INTEGER;
  _current_order UUID[];
  _proposed_order UUID[];
BEGIN
  IF _ticket_ids IS NULL OR array_length(_ticket_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Empty ticket list');
  END IF;

  IF NOT public.user_has_role_in_location(
    auth.uid(), _location_id, ARRAY['owner','manager']::public.location_role[]
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('reorder_tickets_' || _location_id::text));

  _input_count := array_length(_ticket_ids, 1);

  SELECT count(DISTINCT u) INTO _valid_count FROM unnest(_ticket_ids) u;
  IF _valid_count != _input_count THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Duplicate ticket IDs');
  END IF;

  SELECT count(*) INTO _active_count
  FROM public.tickets
  WHERE location_id = _location_id AND status = 'active';

  IF _input_count != _active_count THEN
    RETURN jsonb_build_object('success', false, 'reason', 
      format('Expected %s active tickets, got %s', _active_count, _input_count));
  END IF;

  SELECT count(*) INTO _valid_count
  FROM public.tickets
  WHERE id = ANY(_ticket_ids) AND location_id = _location_id AND status = 'active';

  IF _valid_count != _input_count THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Invalid ticket IDs');
  END IF;

  SELECT array_agg(id ORDER BY sort_order, id) INTO _current_order
  FROM public.tickets
  WHERE location_id = _location_id AND status = 'active';

  _proposed_order := _ticket_ids;

  IF _current_order = _proposed_order THEN
    RETURN jsonb_build_object('success', true, 'changed', false, 'count', _input_count);
  END IF;

  UPDATE public.tickets t
  SET sort_order = (o.ordinality - 1) * 10 + 10
  FROM unnest(_ticket_ids) WITH ORDINALITY AS o(ticket_id, ordinality)
  WHERE t.id = o.ticket_id;

  RETURN jsonb_build_object('success', true, 'changed', true, 'count', _input_count);
END;
$function$;

-- 4. Update enforce_single_default_ticket: remove is_active filter (is_default is status-independent)
CREATE OR REPLACE FUNCTION public.enforce_single_default_ticket()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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
$function$;

-- 5. Update auto_create_default_ticket: remove is_active from INSERT
CREATE OR REPLACE FUNCTION public.auto_create_default_ticket()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _policy_id UUID;
  _ticket_id UUID;
BEGIN
  INSERT INTO public.policy_sets (
    location_id, name, description,
    payment_type, cancel_policy_type, noshow_policy_type,
    noshow_mark_after_minutes, is_active
  ) VALUES (
    NEW.id, 'Standaard', 'Standaard beleid — geen betaling, gratis annuleren',
    'none', 'free', 'mark_only',
    15, true
  ) RETURNING id INTO _policy_id;
  
  INSERT INTO public.tickets (
    location_id, policy_set_id, name, display_title,
    ticket_type, is_default, status, sort_order
  ) VALUES (
    NEW.id, _policy_id, 'Reservering', 'Reservering',
    'default', true, 'active', 10
  ) RETURNING id INTO _ticket_id;
  
  RETURN NEW;
END;
$function$;
