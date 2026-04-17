CREATE OR REPLACE FUNCTION public.validate_ingredienten()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Normaliseer 'stuk' → 'st' (canoniek in DB)
  IF NEW.eenheid = 'stuk' THEN
    NEW.eenheid := 'st';
  END IF;

  IF NEW.eenheid NOT IN ('kg','g','L','ml','st') THEN
    RAISE EXCEPTION 'Invalid eenheid: %', NEW.eenheid;
  END IF;

  IF NEW.kostprijs_bron IS NOT NULL 
     AND NEW.kostprijs_bron NOT IN ('api','handmatig','email','upload','factuur','import') THEN
    RAISE EXCEPTION 'Invalid kostprijs_bron: %. Allowed: api, handmatig, email, upload, factuur, import', NEW.kostprijs_bron;
  END IF;

  IF NEW.opslag_type IS NOT NULL 
     AND NEW.opslag_type NOT IN ('koeling','vriezer','droog','overig') THEN
    RAISE EXCEPTION 'Invalid opslag_type: %', NEW.opslag_type;
  END IF;

  RETURN NEW;
END; $function$;