-- Fix: trigger validate_factuur_uploads_fields() blokkeerde status 'review_blocked'.
-- De Enterprise Pass introduceerde deze status maar de oude trigger-whitelist was niet meegegroeid,
-- waardoor de finale UPDATE in parse-factuur-v2 crashte met "Invalid status: review_blocked".
CREATE OR REPLACE FUNCTION public.validate_factuur_uploads_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.bron NOT IN ('upload', 'email') THEN
    RAISE EXCEPTION 'Invalid bron: %', NEW.bron;
  END IF;
  IF NEW.status NOT IN ('verwerken', 'review', 'review_blocked', 'goedgekeurd', 'afgewezen') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;