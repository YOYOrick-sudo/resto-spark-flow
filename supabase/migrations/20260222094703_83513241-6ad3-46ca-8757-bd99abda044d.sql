
-- ============================================
-- 1a. Trigger: notify_marketing_on_reservation_change
-- Fires when reservation status changes to completed/no_show/cancelled
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_marketing_on_reservation_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer customers%ROWTYPE;
  v_payload jsonb;
BEGIN
  -- Only fire on actual status changes
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  -- Need a customer to create an event
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_customer FROM customers WHERE id = NEW.customer_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF NEW.status = 'completed' THEN
    v_payload := jsonb_build_object(
      'customer_id', NEW.customer_id,
      'party_size', NEW.party_size,
      'total_visits', v_customer.total_visits,
      'reservation_id', NEW.id
    );
    INSERT INTO cross_module_events (location_id, event_type, source_module, payload, expires_at)
    VALUES (NEW.location_id, 'guest_visit_completed', 'reservations', v_payload, now() + INTERVAL '7 days');

  ELSIF NEW.status = 'no_show' THEN
    v_payload := jsonb_build_object(
      'customer_id', NEW.customer_id,
      'no_show_count', v_customer.total_no_shows,
      'reservation_id', NEW.id
    );
    INSERT INTO cross_module_events (location_id, event_type, source_module, payload, expires_at)
    VALUES (NEW.location_id, 'guest_no_show', 'reservations', v_payload, now() + INTERVAL '7 days');

  ELSIF NEW.status = 'cancelled' THEN
    v_payload := jsonb_build_object(
      'customer_id', NEW.customer_id,
      'cancel_count', v_customer.total_cancellations,
      'reservation_id', NEW.id
    );
    INSERT INTO cross_module_events (location_id, event_type, source_module, payload, expires_at)
    VALUES (NEW.location_id, 'guest_cancelled', 'reservations', v_payload, now() + INTERVAL '7 days');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_marketing_on_reservation_change
  AFTER UPDATE OF status ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION notify_marketing_on_reservation_change();

-- ============================================
-- 1b. Trigger: notify_marketing_on_customer_milestone
-- Fires on total_visits milestones: 1, 3, 10
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_marketing_on_customer_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.total_visits = OLD.total_visits THEN RETURN NEW; END IF;

  IF NEW.total_visits IN (1, 3, 10) THEN
    DECLARE
      v_event_type text;
    BEGIN
      CASE NEW.total_visits
        WHEN 1 THEN v_event_type := 'guest_first_visit';
        WHEN 3 THEN v_event_type := 'guest_becoming_regular';
        WHEN 10 THEN v_event_type := 'guest_loyal_milestone';
      END CASE;

      INSERT INTO cross_module_events (location_id, event_type, source_module, payload, expires_at)
      VALUES (
        NEW.location_id,
        v_event_type,
        'reservations',
        jsonb_build_object('customer_id', NEW.id, 'total_visits', NEW.total_visits),
        now() + INTERVAL '7 days'
      );
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_marketing_on_customer_milestone
  AFTER UPDATE OF total_visits ON customers
  FOR EACH ROW
  EXECUTE FUNCTION notify_marketing_on_customer_milestone();

-- ============================================
-- 2. Function: detect_empty_shifts (for pg_cron)
-- Checks tomorrow's shifts for < 40% occupancy
-- ============================================
CREATE OR REPLACE FUNCTION public.detect_empty_shifts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tomorrow date := current_date + 1;
  v_dow int := EXTRACT(ISODOW FROM v_tomorrow)::int;
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      s.id AS shift_id,
      s.name AS shift_name,
      s.location_id,
      COALESCE(SUM(st.seating_limit_guests), 0) AS total_capacity,
      COALESCE(
        (SELECT SUM(res.party_size)
         FROM reservations res
         WHERE res.shift_id = s.id
           AND res.reservation_date = v_tomorrow
           AND res.status IN ('confirmed', 'option', 'pending_payment')),
        0
      ) AS booked_guests
    FROM shifts s
    JOIN shift_tickets st ON st.shift_id = s.id
    WHERE s.is_active = true
      AND v_dow = ANY(s.days_of_week)
      AND st.seating_limit_guests IS NOT NULL
    GROUP BY s.id, s.name, s.location_id
    HAVING COALESCE(SUM(st.seating_limit_guests), 0) > 0
  LOOP
    -- Check if occupancy < 40%
    IF r.booked_guests::numeric / r.total_capacity::numeric < 0.4 THEN
      -- Check if event already exists for this shift+date
      IF NOT EXISTS (
        SELECT 1 FROM cross_module_events
        WHERE event_type = 'empty_shift_detected'
          AND location_id = r.location_id
          AND payload->>'shift_id' = r.shift_id::text
          AND payload->>'date' = v_tomorrow::text
      ) THEN
        INSERT INTO cross_module_events (location_id, event_type, source_module, payload, expires_at)
        VALUES (
          r.location_id,
          'empty_shift_detected',
          'reservations',
          jsonb_build_object(
            'shift_id', r.shift_id,
            'shift_name', r.shift_name,
            'date', v_tomorrow,
            'occupancy_pct', round((r.booked_guests::numeric / r.total_capacity::numeric) * 100),
            'available_seats', r.total_capacity - r.booked_guests
          ),
          v_tomorrow + INTERVAL '2 days'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;
