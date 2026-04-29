-- Loop 4C-FINISH: Auto-create audit + emballage skip support
-- 1. Track herkomst van auto-aangemaakte ingredienten
ALTER TABLE public.ingredienten
ADD COLUMN IF NOT EXISTS created_by_source text;

COMMENT ON COLUMN public.ingredienten.created_by_source IS
'Herkomst van het ingredient-record. NULL/manual = handmatig aangemaakt door chef. ai_pakbon = automatisch via parse-pakbon. ai_factuur = via parse-factuur. import = via CSV-import.';

CREATE INDEX IF NOT EXISTS idx_ingredienten_created_by_source
ON public.ingredienten (location_id, created_by_source)
WHERE created_by_source IS NOT NULL;