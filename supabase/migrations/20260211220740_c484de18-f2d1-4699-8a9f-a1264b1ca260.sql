
CREATE OR REPLACE FUNCTION public.reset_onboarding_phases(p_location_id uuid)
RETURNS SETOF onboarding_phases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _sort INTEGER := 0;
BEGIN
  -- Auth check
  IF NOT user_has_role_in_location(auth.uid(), p_location_id, ARRAY['owner','manager']::location_role[]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 1. Archive all existing phases for this location
  UPDATE onboarding_phases
  SET is_active = false, updated_at = now()
  WHERE location_id = p_location_id AND is_active = true;

  -- 2. Insert the 10 default phases
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

  -- 3. Return the new phases
  RETURN QUERY
  SELECT * FROM onboarding_phases
  WHERE location_id = p_location_id AND is_active = true
  ORDER BY sort_order;
END;
$function$;
