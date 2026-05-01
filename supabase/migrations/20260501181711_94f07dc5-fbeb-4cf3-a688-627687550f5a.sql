-- Sprint A.2: RPC voor bitemporal yield-lookup
-- Pattern: SECURITY DEFINER function met permission-check via SSoT helpers
-- Architectuur-referentie: SHOUF_ARCHITECTUUR_v0.6_H3 — Deel E (Bitemporale snapshot-laag)
-- Rollback: DROP FUNCTION public.get_current_yield(UUID, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.get_current_yield(
  p_methode_id UUID,
  p_effective_at TIMESTAMPTZ DEFAULT NOW(),
  p_asserted_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  yield_pct NUMERIC,
  source TEXT,
  effective_period TSTZRANGE,
  assertion_period TSTZRANGE,
  yield_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Platform users (admin/support): bypass location-check
  IF public.is_platform_user(auth.uid()) THEN
    RETURN QUERY
    SELECT ry.yield_pct, ry.source, ry.effective_period, ry.assertion_period, ry.id
    FROM public.recipe_yield ry
    WHERE ry.halffabricaat_methode_id = p_methode_id
      AND ry.effective_period @> p_effective_at
      AND ry.assertion_period @> p_asserted_at
    LIMIT 1;
    RETURN;
  END IF;

  -- Normale users: check bestaan + locatie-toegang in één query.
  -- "Bestaat niet" en "geen toegang" zijn extern niet te onderscheiden (security door consistent gedrag).
  IF NOT EXISTS (
    SELECT 1 FROM public.halffabricaat_methodes hm
    JOIN public.recepten r ON r.id = hm.recept_id
    WHERE hm.id = p_methode_id
      AND public.user_has_location_access(auth.uid(), r.location_id)
  ) THEN
    RETURN; -- 0 rijen, geen exception
  END IF;

  RETURN QUERY
  SELECT ry.yield_pct, ry.source, ry.effective_period, ry.assertion_period, ry.id
  FROM public.recipe_yield ry
  WHERE ry.halffabricaat_methode_id = p_methode_id
    AND ry.effective_period @> p_effective_at
    AND ry.assertion_period @> p_asserted_at
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_current_yield(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS
'Sprint A.2: Bitemporal yield-lookup. Returns geldende yield_pct voor methode_id op p_effective_at, zoals bekend op p_asserted_at. Beide defaults NOW() = "as-of-now". Returns 0 rijen als (a) geen match, (b) methode bestaat niet, of (c) caller heeft geen location-access — deze drie cases zijn extern niet te onderscheiden (security door consistent gedrag). Alleen platform_user (admin/support) kan via empty-result inferreren of een methode bestaat. Caller behandelt 0 rijen als "geen yield bekend".';

GRANT EXECUTE ON FUNCTION public.get_current_yield(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;