
-- Update notify_onboarding_agent to also fire on hired status change
CREATE OR REPLACE FUNCTION public.notify_onboarding_agent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _event_type TEXT;
  _payload JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _event_type := 'candidate_created';
    _payload := jsonb_build_object(
      'type', _event_type,
      'candidate_id', NEW.id,
      'location_id', NEW.location_id
    );

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.current_phase_id IS DISTINCT FROM OLD.current_phase_id AND NEW.current_phase_id IS NOT NULL THEN
      _event_type := 'phase_changed';
      _payload := jsonb_build_object(
        'type', _event_type,
        'candidate_id', NEW.id,
        'location_id', NEW.location_id,
        'old_phase_id', OLD.current_phase_id,
        'new_phase_id', NEW.current_phase_id
      );
    ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
      _event_type := 'candidate_rejected';
      _payload := jsonb_build_object(
        'type', _event_type,
        'candidate_id', NEW.id,
        'location_id', NEW.location_id
      );
    ELSIF NEW.status = 'hired' AND OLD.status != 'hired' THEN
      _event_type := 'candidate_hired';
      _payload := jsonb_build_object(
        'type', _event_type,
        'candidate_id', NEW.id,
        'location_id', NEW.location_id
      );
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  PERFORM net.http_post(
    url := 'https://igqcfxizgtdkwnajvers.supabase.co/functions/v1/onboarding-agent',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWNmeGl6Z3Rka3duYWp2ZXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjgwMTYsImV4cCI6MjA4MzA0NDAxNn0.nlqsUnilbyP0bLiFECa5-whjgKJxOtSLh66cwdBUOaM"}'::jsonb,
    body := _payload
  );

  RETURN NEW;
END;
$function$;
