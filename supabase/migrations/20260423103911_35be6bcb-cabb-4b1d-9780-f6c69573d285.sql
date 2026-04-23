-- Sprint Factuur-AI V2 — Optie C: SQL RPC voor robuuste naam-matching
-- Vervangt PostgREST .or(ilike) lookups voor Tier-2/3/4.
-- Pure SQL met ANY(unnest) → geen parser-issues met haakjes, komma's, quotes.

CREATE OR REPLACE FUNCTION public.match_ingredienten_by_names(
  p_location_id uuid,
  p_leverancier_id uuid,
  p_namen text[]
)
RETURNS TABLE (
  naam_key text,
  ingredient_id uuid,
  artikel_nummer text,
  tier int,
  confidence numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Tier-2: exact leverancier + artikel_naam (case-insensitive, trimmed)
  SELECT DISTINCT ON (lower(trim(la.artikel_naam)))
    lower(trim(la.artikel_naam)) AS naam_key,
    la.ingredient_id,
    la.artikel_nummer,
    2 AS tier,
    0.95::numeric AS confidence
  FROM leveranciers_artikelen la
  WHERE p_leverancier_id IS NOT NULL
    AND la.leverancier_id = p_leverancier_id
    AND la.is_actief = true
    AND la.ingredient_id IS NOT NULL
    AND lower(trim(la.artikel_naam)) = ANY(
      SELECT lower(trim(n)) FROM unnest(p_namen) n WHERE n IS NOT NULL
    )

  UNION ALL

  -- Tier-3: exact ingredient.naam per location (ongeacht leverancier)
  SELECT DISTINCT ON (lower(trim(i.naam)))
    lower(trim(i.naam)) AS naam_key,
    i.id AS ingredient_id,
    NULL::text AS artikel_nummer,
    3 AS tier,
    0.85::numeric AS confidence
  FROM ingredienten i
  WHERE i.location_id = p_location_id
    AND i.is_archived = false
    AND lower(trim(i.naam)) = ANY(
      SELECT lower(trim(n)) FROM unnest(p_namen) n WHERE n IS NOT NULL
    )
    -- Voorkom duplicate met Tier-2 (zelfde leverancier + zelfde artikel_naam)
    AND NOT EXISTS (
      SELECT 1 FROM leveranciers_artikelen la2
      WHERE p_leverancier_id IS NOT NULL
        AND la2.leverancier_id = p_leverancier_id
        AND la2.is_actief = true
        AND lower(trim(la2.artikel_naam)) = lower(trim(i.naam))
    )

  UNION ALL

  -- Tier-4: alias-match via ingredient_aliassen (per leverancier OF algemeen)
  SELECT DISTINCT ON (lower(trim(ia.alias_naam)))
    lower(trim(ia.alias_naam)) AS naam_key,
    ia.ingredient_id,
    NULL::text AS artikel_nummer,
    4 AS tier,
    0.85::numeric AS confidence
  FROM ingredient_aliassen ia
  JOIN ingredienten i2 ON i2.id = ia.ingredient_id
  WHERE i2.location_id = p_location_id
    AND i2.is_archived = false
    AND (
      ia.leverancier_id IS NULL
      OR (p_leverancier_id IS NOT NULL AND ia.leverancier_id = p_leverancier_id)
    )
    AND lower(trim(ia.alias_naam)) = ANY(
      SELECT lower(trim(n)) FROM unnest(p_namen) n WHERE n IS NOT NULL
    )
$$;

GRANT EXECUTE ON FUNCTION public.match_ingredienten_by_names(uuid, uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_ingredienten_by_names(uuid, uuid, text[]) TO service_role;