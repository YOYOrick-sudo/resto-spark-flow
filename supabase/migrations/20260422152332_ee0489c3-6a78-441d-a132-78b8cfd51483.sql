-- 1. Validatie-trigger uitbreiden voor V2 parse_method waardes
CREATE OR REPLACE FUNCTION public.validate_parse_method()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.parse_method IS NOT NULL AND NEW.parse_method NOT IN (
    'text','text_preview','multimodal','text_then_multimodal',
    'ai_v2_text','ai_v2_multimodal'
  ) THEN
    RAISE EXCEPTION 'invalid parse_method: %', NEW.parse_method;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Additieve kolommen factuur_uploads
ALTER TABLE public.factuur_uploads
  ADD COLUMN IF NOT EXISTS validation_status TEXT
    CHECK (validation_status IN ('valid','warning','invalid')),
  ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_warnings JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_tokens_input INTEGER,
  ADD COLUMN IF NOT EXISTS ai_tokens_output INTEGER,
  ADD COLUMN IF NOT EXISTS ai_cost_estimate NUMERIC(10,6);

-- 3. Additieve kolommen factuur_regels
ALTER TABLE public.factuur_regels
  ADD COLUMN IF NOT EXISTS product_omschrijving_kort TEXT,
  ADD COLUMN IF NOT EXISTS extract_confidence TEXT
    CHECK (extract_confidence IN ('hoog','medium','laag')),
  ADD COLUMN IF NOT EXISTS is_emballage BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_credit BOOLEAN DEFAULT FALSE;