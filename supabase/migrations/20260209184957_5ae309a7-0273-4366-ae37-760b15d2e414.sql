
-- 1. Enable pg_net extension
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Trigger function that calls the onboarding-agent Edge Function
CREATE OR REPLACE FUNCTION public.notify_onboarding_agent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- 3. Triggers
CREATE TRIGGER trg_notify_agent_candidate_created
  AFTER INSERT ON public.onboarding_candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_onboarding_agent();

CREATE TRIGGER trg_notify_agent_candidate_updated
  AFTER UPDATE ON public.onboarding_candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_onboarding_agent();
