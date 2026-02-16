
-- Fase 4.7a: Add risk_factors JSONB column to reservations
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS risk_factors JSONB;

-- Rewrite calculate_no_show_risk to populate risk_factors breakdown
CREATE OR REPLACE FUNCTION public.calculate_no_show_risk(_reservation_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  _score NUMERIC(5,2) := 0;
  _r RECORD;
  _noshow_rate NUMERIC;
  _lead_days INTEGER;
  _dow INTEGER;
  -- Per-factor scores
  _guest_score NUMERIC(5,2) := 0;
  _party_score NUMERIC(5,2) := 0;
  _lead_score NUMERIC(5,2) := 0;
  _chan_score NUMERIC(5,2) := 0;
  _day_score NUMERIC(5,2) := 0;
  -- Detail strings
  _guest_detail TEXT;
  _party_detail TEXT;
  _lead_detail TEXT;
  _chan_detail TEXT;
  _day_detail TEXT;
BEGIN
  SELECT r.*, c.total_visits, c.total_no_shows, c.total_cancellations
  INTO _r
  FROM public.reservations r
  JOIN public.customers c ON c.id = r.customer_id
  WHERE r.id = _reservation_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  -- Factor 1: Guest history — 40 pts max
  IF _r.total_visits > 0 THEN
    _noshow_rate := _r.total_no_shows::NUMERIC / _r.total_visits;
    _guest_score := LEAST(_noshow_rate * 40, 40);
    _guest_detail := _r.total_no_shows || ' no-shows van ' || _r.total_visits || ' bezoeken';
  ELSE
    _guest_score := 6;
    _guest_detail := 'Nieuwe gast';
  END IF;

  -- Factor 2: Party size — 20 pts max
  IF _r.party_size >= 7 THEN _party_score := 20;
  ELSIF _r.party_size >= 5 THEN _party_score := 12;
  ELSIF _r.party_size >= 3 THEN _party_score := 6;
  ELSE _party_score := 2;
  END IF;
  _party_detail := _r.party_size || ' personen';

  -- Factor 3: Lead time — 20 pts max
  _lead_days := _r.reservation_date - CURRENT_DATE;
  IF _lead_days > 30 THEN _lead_score := 20;
  ELSIF _lead_days >= 15 THEN _lead_score := 15;
  ELSIF _lead_days >= 8 THEN _lead_score := 10;
  ELSIF _lead_days >= 2 THEN _lead_score := 4;
  ELSE _lead_score := 1;
  END IF;
  _lead_detail := _lead_days || ' dagen van tevoren';

  -- Factor 4: Channel — 10 pts max
  CASE _r.channel
    WHEN 'walk_in'   THEN _chan_score := 0;
    WHEN 'phone'     THEN _chan_score := 1;
    WHEN 'operator'  THEN _chan_score := 2;
    WHEN 'whatsapp'  THEN _chan_score := 3;
    WHEN 'widget'    THEN _chan_score := 6;
    WHEN 'google'    THEN _chan_score := 10;
    ELSE _chan_score := 0;
  END CASE;
  _chan_detail := _r.channel::text;

  -- Factor 5: Day of the week — 10 pts max
  _dow := EXTRACT(ISODOW FROM _r.reservation_date);
  CASE
    WHEN _dow = 6 THEN _day_score := 10;
    WHEN _dow = 5 THEN _day_score := 5;
    WHEN _dow = 7 THEN _day_score := 4;
    ELSE _day_score := 2;
  END CASE;
  _day_detail := trim(to_char(_r.reservation_date, 'Day'));

  _score := _guest_score + _party_score + _lead_score + _chan_score + _day_score;

  -- Update risk_factors alongside score
  UPDATE public.reservations
  SET
    no_show_risk_score = LEAST(_score, 100),
    risk_factors = jsonb_build_object(
      'guest_history', jsonb_build_object('score', _guest_score, 'weight', 40, 'detail', _guest_detail),
      'party_size',    jsonb_build_object('score', _party_score, 'weight', 20, 'detail', _party_detail),
      'booking_lead',  jsonb_build_object('score', _lead_score,  'weight', 20, 'detail', _lead_detail),
      'channel',       jsonb_build_object('score', _chan_score,   'weight', 10, 'detail', _chan_detail),
      'day_of_week',   jsonb_build_object('score', _day_score,   'weight', 10, 'detail', _day_detail)
    )
  WHERE id = _reservation_id;

  RETURN LEAST(_score, 100);
END;
$function$;

-- Update the BEFORE INSERT trigger to also populate risk_factors
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
  -- Get customer stats
  SELECT c.total_visits, c.total_no_shows
  INTO _total_visits, _total_no_shows
  FROM public.customers c WHERE c.id = NEW.customer_id;

  IF NOT FOUND THEN
    NEW.no_show_risk_score := 0;
    RETURN NEW;
  END IF;

  -- Factor 1: Guest history
  IF _total_visits > 0 THEN
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
