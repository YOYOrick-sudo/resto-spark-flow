CREATE OR REPLACE FUNCTION public.validate_checklist_template_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.type NOT IN ('opening','sluiting','tussentijds','schoonmaak','haccp','onderhoud') THEN
    RAISE EXCEPTION 'Invalid checklist type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$function$;