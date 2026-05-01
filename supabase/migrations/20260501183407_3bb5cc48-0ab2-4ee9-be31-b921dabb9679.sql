-- Sprint A.3: Yield history RPC voor audit-trail UI
-- Pattern: read-only audit query, gefilterd op locatie-toegang
-- Architectuur-referentie: SHOUF_ARCHITECTUUR_v0.6_H3 — Deel E
-- Rollback: DROP FUNCTION public.get_yield_history(uuid);

CREATE OR REPLACE FUNCTION public.get_yield_history(p_methode_id UUID)
RETURNS TABLE (
  id                UUID,
  yield_pct         NUMERIC,
  source            TEXT,
  effective_period  TSTZRANGE,
  assertion_period  TSTZRANGE,
  correction_reason TEXT,
  created_at        TIMESTAMPTZ,
  created_by        UUID,
  created_by_name   TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_has_access BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Toegangscheck (consistent met get_current_yield)
  IF NOT public.is_platform_user(v_user_id) THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.halffabricaat_methodes hm
      JOIN public.recepten r ON r.id = hm.recept_id
      WHERE hm.id = p_methode_id
        AND public.user_has_location_access(v_user_id, r.location_id)
    ) INTO v_has_access;

    IF NOT v_has_access THEN
      RETURN; -- 0 rijen, geen exception
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    ry.id,
    ry.yield_pct,
    ry.source,
    ry.effective_period,
    ry.assertion_period,
    ry.correction_reason,
    ry.created_at,
    ry.created_by,
    p.name AS created_by_name
  FROM public.recipe_yield ry
  LEFT JOIN public.profiles p ON p.id = ry.created_by
  WHERE ry.halffabricaat_methode_id = p_methode_id
  ORDER BY ry.created_at DESC, lower(ry.assertion_period) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_yield_history(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_yield_history IS
  'Sprint A.3 — Volledige bitemporale audit-trail per methode, incl. naam van aanpasser via profiles.name.';
