-- Internal seed function (no auth check, callable by triggers/migrations)
CREATE OR REPLACE FUNCTION public._seed_default_onboarding_phases(p_location_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE onboarding_phases
  SET is_active = false, updated_at = now()
  WHERE location_id = p_location_id AND is_active = true;

  INSERT INTO onboarding_phases (location_id, name, description, sort_order, is_active, is_custom, task_templates)
  VALUES
    (p_location_id, 'Aanmelding ontvangen', 'Nieuwe sollicitatie is binnengekomen', 10, true, false,
     '[{"title":"Ontvangstbevestiging sturen","is_system":true,"task_type":"send_email","is_automated":true}]'::jsonb),
    (p_location_id, 'Screening', 'Beoordeel de kandidaat op basis van CV en motivatie', 20, true, false,
     '[{"title":"Aanvullende vragen sturen","is_system":true,"task_type":"send_email","is_automated":true}]'::jsonb),
    (p_location_id, 'Uitnodiging gesprek', 'Nodig de kandidaat uit voor een kennismakingsgesprek', 30, true, false, '[]'::jsonb),
    (p_location_id, 'Gesprek', 'Voer het sollicitatiegesprek', 40, true, false, '[]'::jsonb),
    (p_location_id, 'Meeloopdag', 'Kandidaat loopt een dag mee in het restaurant', 50, true, false, '[]'::jsonb),
    (p_location_id, 'Beslissing', 'Neem een definitieve beslissing over de kandidaat', 60, true, false, '[]'::jsonb),
    (p_location_id, 'Aanbod', 'Doe een aanbod aan de kandidaat', 70, true, false,
     '[{"title":"Contract versturen","is_system":true,"task_type":"send_email","is_automated":true}]'::jsonb),
    (p_location_id, 'Pre-boarding', 'Bereid de nieuwe medewerker voor op de eerste werkdag', 80, true, false,
     '[{"title":"Welkomstmail sturen","is_system":true,"task_type":"send_email","is_automated":true}]'::jsonb),
    (p_location_id, 'Eerste werkdag', 'Begeleid de medewerker op de eerste werkdag', 90, true, false, '[]'::jsonb),
    (p_location_id, 'Inwerkperiode', 'Begeleid de medewerker tijdens het inwerktraject', 100, true, false, '[]'::jsonb);
END;
$$;

-- Trigger: seed default phases on new location
CREATE OR REPLACE FUNCTION public.auto_seed_onboarding_phases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._seed_default_onboarding_phases(NEW.id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_seed_onboarding_phases failed for location %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_seed_onboarding_phases ON public.locations;
CREATE TRIGGER trg_auto_seed_onboarding_phases
AFTER INSERT ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.auto_seed_onboarding_phases();

-- Repair existing locations without complete phase config
DO $$
DECLARE
  loc RECORD;
BEGIN
  FOR loc IN
    SELECT l.id
    FROM public.locations l
    WHERE NOT EXISTS (
      SELECT 1 FROM public.onboarding_phases op
      WHERE op.location_id = l.id
        AND op.is_active = true
        AND jsonb_array_length(COALESCE(op.task_templates, '[]'::jsonb)) > 0
    )
  LOOP
    PERFORM public._seed_default_onboarding_phases(loc.id);
  END LOOP;
END $$;

-- Update reset_onboarding_phases to delegate to the internal function (keeps single source of truth)
CREATE OR REPLACE FUNCTION public.reset_onboarding_phases(p_location_id uuid)
RETURNS SETOF onboarding_phases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT user_has_role_in_location(auth.uid(), p_location_id, ARRAY['owner','manager']::location_role[]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  PERFORM public._seed_default_onboarding_phases(p_location_id);

  RETURN QUERY
  SELECT * FROM onboarding_phases
  WHERE location_id = p_location_id AND is_active = true
  ORDER BY sort_order;
END;
$$;