
-- Trigger function: fire waitlist-invite-engine on cancel OR no_show
CREATE OR REPLACE FUNCTION public.fn_trigger_waitlist_on_cancel()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF (OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled')
     OR (OLD.status IS DISTINCT FROM 'no_show' AND NEW.status = 'no_show')
  THEN
    PERFORM net.http_post(
      url := 'https://igqcfxizgtdkwnajvers.supabase.co/functions/v1/waitlist-invite-engine',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWNmeGl6Z3Rka3duYWp2ZXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjgwMTYsImV4cCI6MjA4MzA0NDAxNn0.nlqsUnilbyP0bLiFECa5-whjgKJxOtSLh66cwdBUOaM"}'::jsonb,
      body := jsonb_build_object(
        'location_id', NEW.location_id,
        'date', NEW.reservation_date,
        'start_time', NEW.start_time,
        'party_size', NEW.party_size,
        'shift_id', NEW.shift_id,
        'ticket_id', NEW.ticket_id
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_waitlist_on_cancel
  AFTER UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trigger_waitlist_on_cancel();
