-- Sprint A.3: User-facing yield correction RPC
-- Pattern: bitemporal correction (close current assertion + insert new row)
-- Architectuur-referentie: SHOUF_ARCHITECTUUR_v0.6_H3 — Deel E
-- Rollback: DROP FUNCTION public.apply_yield_correction(uuid, numeric, timestamptz, text);

CREATE OR REPLACE FUNCTION public.apply_yield_correction(
  p_methode_id        UUID,
  p_new_yield_pct     NUMERIC,
  p_effective_from    TIMESTAMPTZ DEFAULT NOW(),
  p_correction_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id    UUID := auth.uid();
  v_now        TIMESTAMPTZ := NOW();
  v_new_id     UUID;
  v_source     TEXT;
  v_has_access BOOLEAN;
BEGIN
  -- Auth
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticatie vereist' USING ERRCODE = '28000';
  END IF;

  -- Validatie input
  IF p_new_yield_pct IS NULL OR p_new_yield_pct <= 0 OR p_new_yield_pct > 2 THEN
    RAISE EXCEPTION 'yield_pct moet > 0 en <= 2 zijn, kreeg: %', p_new_yield_pct
      USING ERRCODE = '22023';
  END IF;
  IF p_effective_from IS NULL OR p_effective_from > v_now THEN
    RAISE EXCEPTION 'effective_from mag niet in de toekomst liggen' USING ERRCODE = '22023';
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
      RAISE EXCEPTION 'Geen toegang tot deze methode' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Source-bepaling op basis van effective_from t.o.v. NOW
  v_source := CASE
    WHEN p_effective_from < v_now THEN 'correction'      -- retroactief
    ELSE 'manual_override'                                -- vanaf nu
  END;

  -- Stap 1: sluit assertion van rijen die door deze nieuwe rij worden gesuperseded.
  -- Voor "vanaf nu": de huidige geldende rij (assertion @> nu, effective @> nu).
  -- Voor retroactief: alle currently-asserted rijen die overlappen met [effective_from, ∞).
  UPDATE public.recipe_yield
  SET assertion_period = tstzrange(lower(assertion_period), v_now, '[)')
  WHERE halffabricaat_methode_id = p_methode_id
    AND assertion_period @> v_now
    AND effective_period && tstzrange(p_effective_from, NULL, '[)');

  -- Stap 2: insert nieuwe yield-rij
  INSERT INTO public.recipe_yield (
    halffabricaat_methode_id,
    yield_pct,
    effective_period,
    assertion_period,
    source,
    correction_reason,
    created_by
  ) VALUES (
    p_methode_id,
    p_new_yield_pct,
    tstzrange(p_effective_from, NULL, '[)'),
    tstzrange(v_now, NULL, '[)'),
    v_source,
    p_correction_reason,
    v_user_id
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_yield_correction(UUID, NUMERIC, TIMESTAMPTZ, TEXT) TO authenticated;

COMMENT ON FUNCTION public.apply_yield_correction IS
  'Sprint A.3 — Bitemporale yield-correctie. Modus A (effective_from = NOW): source=manual_override. Modus B (effective_from < NOW): source=correction. Sluit huidige assertion, voegt nieuwe rij toe. Returns nieuwe row ID.';
