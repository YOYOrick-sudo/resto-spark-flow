-- Migratie 1: AI-hint kolommen voor factuur regels
ALTER TABLE public.factuur_regels
  ADD COLUMN IF NOT EXISTS ai_category_hint text,
  ADD COLUMN IF NOT EXISTS ai_suggested_eenheid text;

-- Migratie 2: kostprijs_bron lijst uitbreiden met 'factuur' en 'import'
-- (eenheid en opslag_type validaties blijven identiek aan origineel)
CREATE OR REPLACE FUNCTION public.validate_ingredienten()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.eenheid NOT IN ('kg','g','L','ml','st') THEN
    RAISE EXCEPTION 'Invalid eenheid: %', NEW.eenheid;
  END IF;
  IF NEW.kostprijs_bron IS NOT NULL AND NEW.kostprijs_bron NOT IN ('api','handmatig','email','upload','factuur','import') THEN
    RAISE EXCEPTION 'Invalid kostprijs_bron: %. Allowed: api, handmatig, email, upload, factuur, import', NEW.kostprijs_bron;
  END IF;
  IF NEW.opslag_type IS NOT NULL AND NEW.opslag_type NOT IN ('koeling','vriezer','droog','overig') THEN
    RAISE EXCEPTION 'Invalid opslag_type: %', NEW.opslag_type;
  END IF;
  RETURN NEW;
END; $function$;