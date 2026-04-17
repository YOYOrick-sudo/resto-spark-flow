CREATE OR REPLACE FUNCTION public.fuzzy_match_ingredient(p_location_id uuid, p_naam text)
RETURNS TABLE (id uuid, naam text, eenheid text, kostprijs numeric, similarity real)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT i.id, i.naam, i.eenheid, i.kostprijs,
         extensions.similarity(LOWER(i.naam), LOWER(p_naam))
  FROM ingredienten i
  WHERE i.location_id = p_location_id
    AND i.is_archived = false
    AND extensions.similarity(LOWER(i.naam), LOWER(p_naam)) > 0.3
  ORDER BY 5 DESC
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION public.fuzzy_match_ingredient(uuid, text) TO authenticated;