CREATE OR REPLACE FUNCTION public.fuzzy_match_leverancier(p_location_id uuid, p_naam text)
RETURNS TABLE (id uuid, naam text, similarity real)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT l.id, l.naam, extensions.similarity(LOWER(l.naam), LOWER(p_naam))
  FROM leveranciers l
  WHERE l.location_id = p_location_id
    AND l.is_actief = true
    AND extensions.similarity(LOWER(l.naam), LOWER(p_naam)) > 0.3
  ORDER BY 3 DESC LIMIT 5;
$$;