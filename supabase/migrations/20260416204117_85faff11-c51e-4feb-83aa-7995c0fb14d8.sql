-- Fuzzy match suggesties voor handmatige leverancier-koppeling
CREATE OR REPLACE FUNCTION public.fuzzy_match_leverancier(
  p_location_id UUID,
  p_naam TEXT
)
RETURNS TABLE (id UUID, naam TEXT, similarity REAL)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT 
    l.id, 
    l.naam, 
    extensions.similarity(LOWER(l.naam), LOWER(p_naam)) AS similarity
  FROM leveranciers l
  WHERE l.location_id = p_location_id
    AND l.is_actief = true
    AND extensions.similarity(LOWER(l.naam), LOWER(p_naam)) > 0.3
  ORDER BY similarity DESC
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION public.fuzzy_match_leverancier(UUID, TEXT) TO authenticated;

-- Realtime voor factuur_uploads (live status-updates tijdens AI-parse)
ALTER TABLE public.factuur_uploads REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'factuur_uploads'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.factuur_uploads';
  END IF;
END $$;