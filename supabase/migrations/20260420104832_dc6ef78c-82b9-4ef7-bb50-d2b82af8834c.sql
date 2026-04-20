-- Sprint A Ronde 1: Fuzzy leverancier-match
-- Add fuzzy_kandidaten kolom aan factuur_uploads voor opslag van fuzzy-suggesties
ALTER TABLE public.factuur_uploads 
  ADD COLUMN IF NOT EXISTS fuzzy_kandidaten JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.factuur_uploads.fuzzy_kandidaten IS 
  'Array van top-3 fuzzy-match leveranciers wanneer exact ILIKE faalt. Format: [{id, naam, similarity}]';