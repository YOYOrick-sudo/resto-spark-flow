
-- D.6b — AI kolommen op factuur_uploads en factuur_regels

ALTER TABLE public.factuur_uploads ADD COLUMN IF NOT EXISTS ai_parsing_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE public.factuur_uploads ADD COLUMN IF NOT EXISTS ai_parsed_at TIMESTAMPTZ;
ALTER TABLE public.factuur_uploads ADD COLUMN IF NOT EXISTS ai_confidence_overall DECIMAL(3,2);
ALTER TABLE public.factuur_uploads ADD COLUMN IF NOT EXISTS ai_raw_response JSONB;

CREATE OR REPLACE FUNCTION public.validate_ai_parsing_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ai_parsing_status IS NOT NULL AND NEW.ai_parsing_status NOT IN ('pending', 'processing', 'completed', 'failed') THEN
    RAISE EXCEPTION 'Invalid ai_parsing_status value';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_ai_parsing_status ON public.factuur_uploads;
CREATE TRIGGER trg_validate_ai_parsing_status
  BEFORE INSERT OR UPDATE ON public.factuur_uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_ai_parsing_status();

ALTER TABLE public.factuur_regels ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2);
ALTER TABLE public.factuur_regels ADD COLUMN IF NOT EXISTS ai_raw_naam TEXT;
ALTER TABLE public.factuur_regels ADD COLUMN IF NOT EXISTS ai_raw_artikelnummer TEXT;
ALTER TABLE public.factuur_regels ADD COLUMN IF NOT EXISTS ai_suggested_naam TEXT;
ALTER TABLE public.factuur_regels ADD COLUMN IF NOT EXISTS is_nieuw_ingredient BOOLEAN DEFAULT false;
