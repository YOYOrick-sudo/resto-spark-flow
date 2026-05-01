DO $$
DECLARE
  v_methode_id UUID;
  v_yield_id UUID;
  v_overlap_blocked BOOLEAN := false;
  v_bitemporal_ok BOOLEAN := false;
  v_count_before INT;
  v_count_after_correction INT;
BEGIN
  SELECT id INTO v_methode_id FROM halffabricaat_methodes LIMIT 1;
  SELECT id INTO v_yield_id FROM recipe_yield WHERE halffabricaat_methode_id = v_methode_id LIMIT 1;

  -- =========================================================================
  -- TEST 4.1: GIST overlap — moet falen met exclusion_violation
  -- =========================================================================
  BEGIN
    INSERT INTO recipe_yield (halffabricaat_methode_id, yield_pct, effective_period, assertion_period, source)
    VALUES (v_methode_id, 0.95, tstzrange(now(), NULL, '[)'), tstzrange(now(), NULL, '[)'), 'observed');
    RAISE NOTICE '[4.1] FAIL: overlap niet geblokkeerd';
  EXCEPTION WHEN exclusion_violation THEN
    v_overlap_blocked := true;
    RAISE NOTICE '[4.1] PASS: GIST exclusion blokkeert overlappende periodes';
  END;

  -- =========================================================================
  -- TEST 4.2: Bitemporale correctie
  -- Stap 1: sluit huidige assertion-periode (= "we geloofden dit tot nu")
  -- Stap 2: open nieuwe rij met gecorrigeerde yield + nieuwe assertion-periode
  -- =========================================================================
  SELECT COUNT(*) INTO v_count_before FROM recipe_yield WHERE halffabricaat_methode_id = v_methode_id;

  -- Sluit de bestaande assertion-periode
  UPDATE recipe_yield
  SET assertion_period = tstzrange(lower(assertion_period), now(), '[)')
  WHERE id = v_yield_id;

  -- Voeg een gecorrigeerde rij toe (zelfde effective, nieuwe assertion)
  INSERT INTO recipe_yield (halffabricaat_methode_id, yield_pct, effective_period, assertion_period, source, correction_reason)
  VALUES (
    v_methode_id, 0.85,
    tstzrange(now() - INTERVAL '1 day', NULL, '[)'),
    tstzrange(now(), NULL, '[)'),
    'correction',
    'Test bitemporale correctie'
  );

  SELECT COUNT(*) INTO v_count_after_correction FROM recipe_yield WHERE halffabricaat_methode_id = v_methode_id;
  
  IF v_count_after_correction = v_count_before + 1 THEN
    v_bitemporal_ok := true;
    RAISE NOTICE '[4.2] PASS: bitemporale correctie werkt (1 rij gesloten, 1 nieuwe geopend, geen overlap-error)';
  ELSE
    RAISE NOTICE '[4.2] FAIL: rij-aantal klopt niet (was %, nu %)', v_count_before, v_count_after_correction;
  END IF;

  -- Cleanup test-data uit 4.2
  DELETE FROM recipe_yield WHERE source = 'correction' AND correction_reason = 'Test bitemporale correctie';
  UPDATE recipe_yield
  SET assertion_period = tstzrange(lower(assertion_period), NULL, '[)')
  WHERE id = v_yield_id;

  RAISE NOTICE '[CLEANUP] Test-data uit 4.2 verwijderd, originele assertion-periode hersteld';
END $$;

-- =========================================================================
-- TEST 4.3 (NIEUW): Rollback + idempotency
-- DROP TABLE en recreate. Bevestigt dat halffabricaat_methodes ongemoeid blijft
-- en dat de migratie-SQL idempotent re-runbaar is.
-- =========================================================================
DO $$
DECLARE
  v_hm_count_before INT;
  v_hm_count_after INT;
  v_recepten_before INT;
  v_recepten_after INT;
BEGIN
  SELECT COUNT(*) INTO v_hm_count_before FROM halffabricaat_methodes;
  SELECT COUNT(*) INTO v_recepten_before FROM recepten;
  
  -- ROLLBACK: DROP de tabel
  DROP TABLE recipe_yield CASCADE;
  RAISE NOTICE '[4.3a] DROP TABLE recipe_yield CASCADE uitgevoerd';
  
  -- VERIFY: andere tabellen ongemoeid
  SELECT COUNT(*) INTO v_hm_count_after FROM halffabricaat_methodes;
  SELECT COUNT(*) INTO v_recepten_after FROM recepten;
  
  IF v_hm_count_before = v_hm_count_after AND v_recepten_before = v_recepten_after THEN
    RAISE NOTICE '[4.3b] PASS: halffabricaat_methodes (%) en recepten (%) ongemoeid', v_hm_count_after, v_recepten_after;
  ELSE
    RAISE NOTICE '[4.3b] FAIL: counts gewijzigd (hm % -> %, rec % -> %)', v_hm_count_before, v_hm_count_after, v_recepten_before, v_recepten_after;
  END IF;
END $$;

-- RECREATE: zelfde migration-SQL opnieuw draaien (idempotency check)
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.recipe_yield (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  halffabricaat_methode_id UUID NOT NULL REFERENCES public.halffabricaat_methodes(id) ON DELETE CASCADE,
  yield_pct NUMERIC(6,4) NOT NULL CHECK (yield_pct > 0 AND yield_pct <= 2),
  effective_period TSTZRANGE NOT NULL,
  assertion_period TSTZRANGE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('industry_default','observed','manual_override','imported','correction')),
  correction_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recipe_yield_no_overlap EXCLUDE USING gist (
    halffabricaat_methode_id WITH =,
    effective_period WITH &&,
    assertion_period WITH &&
  )
);

CREATE INDEX IF NOT EXISTS idx_recipe_yield_methode ON public.recipe_yield(halffabricaat_methode_id);
CREATE INDEX IF NOT EXISTS idx_recipe_yield_effective ON public.recipe_yield USING gist (effective_period);
CREATE INDEX IF NOT EXISTS idx_recipe_yield_assertion ON public.recipe_yield USING gist (assertion_period);

ALTER TABLE public.recipe_yield ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recipe_yield_select ON public.recipe_yield;
CREATE POLICY recipe_yield_select ON public.recipe_yield FOR SELECT USING (
  public.is_platform_user(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.halffabricaat_methodes hm
    JOIN public.recepten r ON r.id = hm.recept_id
    WHERE hm.id = recipe_yield.halffabricaat_methode_id
      AND public.user_has_location_access(auth.uid(), r.location_id)
  )
);

DROP POLICY IF EXISTS recipe_yield_insert ON public.recipe_yield;
CREATE POLICY recipe_yield_insert ON public.recipe_yield FOR INSERT WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.halffabricaat_methodes hm
    JOIN public.recepten r ON r.id = hm.recept_id
    WHERE hm.id = recipe_yield.halffabricaat_methode_id
      AND public.user_has_role_in_location(auth.uid(), r.location_id, ARRAY['owner','manager','kitchen']::location_role[])
  )
);

DROP POLICY IF EXISTS recipe_yield_update ON public.recipe_yield;
CREATE POLICY recipe_yield_update ON public.recipe_yield FOR UPDATE USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.halffabricaat_methodes hm
    JOIN public.recepten r ON r.id = hm.recept_id
    WHERE hm.id = recipe_yield.halffabricaat_methode_id
      AND public.user_has_role_in_location(auth.uid(), r.location_id, ARRAY['owner','manager','kitchen']::location_role[])
  )
);

DROP POLICY IF EXISTS recipe_yield_delete ON public.recipe_yield;
CREATE POLICY recipe_yield_delete ON public.recipe_yield FOR DELETE USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.halffabricaat_methodes hm
    JOIN public.recepten r ON r.id = hm.recept_id
    WHERE hm.id = recipe_yield.halffabricaat_methode_id
      AND public.user_has_role_in_location(auth.uid(), r.location_id, ARRAY['owner','manager']::location_role[])
  )
);

-- Re-seed (idempotent)
INSERT INTO public.recipe_yield (halffabricaat_methode_id, yield_pct, effective_period, assertion_period, source)
SELECT hm.id, 1.0, tstzrange(now(), NULL, '[)'), tstzrange(now(), NULL, '[)'), 'industry_default'
FROM public.halffabricaat_methodes hm
WHERE NOT EXISTS (SELECT 1 FROM public.recipe_yield ry WHERE ry.halffabricaat_methode_id = hm.id);

-- Re-run alleen seed-clausule (zou 0 rijen moeten toevoegen, bewijst idempotency)
INSERT INTO public.recipe_yield (halffabricaat_methode_id, yield_pct, effective_period, assertion_period, source)
SELECT hm.id, 1.0, tstzrange(now(), NULL, '[)'), tstzrange(now(), NULL, '[)'), 'industry_default'
FROM public.halffabricaat_methodes hm
WHERE NOT EXISTS (SELECT 1 FROM public.recipe_yield ry WHERE ry.halffabricaat_methode_id = hm.id);

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM recipe_yield;
  RAISE NOTICE '[4.3c] PASS: na DROP + recreate + 2x re-seed: % rijen (verwacht 13)', v_count;
END $$;