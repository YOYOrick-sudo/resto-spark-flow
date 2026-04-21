-- Add parse_method and parse_confidence to factuur_uploads
ALTER TABLE public.factuur_uploads
  ADD COLUMN IF NOT EXISTS parse_method text NOT NULL DEFAULT 'multimodal',
  ADD COLUMN IF NOT EXISTS parse_confidence numeric(3,2);

-- Validation trigger (geen CHECK constraint per project-rule)
CREATE OR REPLACE FUNCTION public.validate_parse_method()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.parse_method NOT IN ('text', 'text_preview', 'multimodal', 'text_then_multimodal') THEN
    RAISE EXCEPTION 'invalid parse_method: %, must be one of text/text_preview/multimodal/text_then_multimodal', NEW.parse_method;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_validate_parse_method ON public.factuur_uploads;
CREATE TRIGGER trg_validate_parse_method
  BEFORE INSERT OR UPDATE OF parse_method ON public.factuur_uploads
  FOR EACH ROW EXECUTE FUNCTION public.validate_parse_method();