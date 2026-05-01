DO $$
DECLARE
  v_methode_id UUID;
  v_seed_id UUID;
  v_seed_lower TIMESTAMPTZ;
  r RECORD;
  v_count INT;
  v_correction_time TIMESTAMPTZ;
BEGIN
  SELECT id INTO v_methode_id FROM halffabricaat_methodes LIMIT 1;
  SELECT id, lower(assertion_period) INTO v_seed_id, v_seed_lower
  FROM recipe_yield WHERE halffabricaat_methode_id = v_methode_id LIMIT 1;
  RAISE NOTICE '=== Test methode_id: % ===', v_methode_id;

  -- =========================================================================
  -- 4.1: Happy path — as-of-now lookup geeft seeded industry_default
  -- =========================================================================
  RAISE NOTICE '--- 4.1 Happy path ---';
  FOR r IN SELECT * FROM get_current_yield(v_methode_id) LOOP
    RAISE NOTICE '  yield_pct=% source=% effective=% assertion=%',
      r.yield_pct, r.source, r.effective_period, r.assertion_period;
    IF r.yield_pct = 1.0 AND r.source = 'industry_default' THEN
      RAISE NOTICE '  [4.1] PASS';
    ELSE
      RAISE NOTICE '  [4.1] FAIL: onverwachte waarden';
    END IF;
  END LOOP;

  -- =========================================================================
  -- 4.5: Default parameters — call zonder tijd-args = call met NOW()
  -- =========================================================================
  RAISE NOTICE '--- 4.5 Default parameters ---';
  SELECT COUNT(*) INTO v_count FROM (
    SELECT * FROM get_current_yield(v_methode_id)
    INTERSECT
    SELECT * FROM get_current_yield(v_methode_id, NOW(), NOW())
  ) x;
  IF v_count = 1 THEN
    RAISE NOTICE '  [4.5] PASS: defaults gedragen identiek aan expliciete NOW()';
  ELSE
    RAISE NOTICE '  [4.5] FAIL: aantal matches=%', v_count;
  END IF;

  -- =========================================================================
  -- 4.3: Non-existent methode — 0 rijen, geen exception
  -- =========================================================================
  RAISE NOTICE '--- 4.3 Non-existent methode ---';
  SELECT COUNT(*) INTO v_count FROM get_current_yield('00000000-0000-0000-0000-000000000000'::uuid);
  IF v_count = 0 THEN
    RAISE NOTICE '  [4.3] PASS: non-existent UUID returnt 0 rijen, geen exception';
  ELSE
    RAISE NOTICE '  [4.3] FAIL: % rijen returned', v_count;
  END IF;
  -- Note: caller hier is service-role (=platform-niveau in deze context).
  -- Voor non-platform users geldt: 0 rijen voor zowel non-existent als no-access (consistent gedrag).

  -- =========================================================================
  -- 4.2: Bitemporal correctie
  -- Setup: sluit assertion van seed-rij, voeg correction-rij toe
  -- =========================================================================
  RAISE NOTICE '--- 4.2 Bitemporal as-of-now vs as-of-then ---';
  v_correction_time := NOW();

  UPDATE recipe_yield
  SET assertion_period = tstzrange(lower(assertion_period), v_correction_time, '[)')
  WHERE id = v_seed_id;

  INSERT INTO recipe_yield (
    halffabricaat_methode_id, yield_pct, effective_period, assertion_period, source, correction_reason
  ) VALUES (
    v_methode_id, 0.6,
    tstzrange('2026-03-01'::timestamptz, NULL, '[)'),
    tstzrange(v_correction_time, NULL, '[)'),
    'correction',
    'Test A.2 verificatie 4.2'
  );

  -- 4.2a: as-of-now lookup voor effective 1 april 2026 → moet 0.6 zijn
  RAISE NOTICE '  4.2a: as-of-now (effective=2026-04-01, asserted=NOW)';
  FOR r IN SELECT * FROM get_current_yield(v_methode_id, '2026-04-01'::timestamptz, NOW()) LOOP
    RAISE NOTICE '    yield_pct=% source=%', r.yield_pct, r.source;
    IF r.yield_pct = 0.6 AND r.source = 'correction' THEN
      RAISE NOTICE '    [4.2a] PASS';
    ELSE
      RAISE NOTICE '    [4.2a] FAIL';
    END IF;
  END LOOP;

  -- 4.2b: as-of-then lookup (vóór correction_time) voor effective 1 april 2026 → moet 1.0 zijn
  RAISE NOTICE '  4.2b: as-of-then (effective=2026-04-01, asserted=correction_time - 1s)';
  FOR r IN SELECT * FROM get_current_yield(v_methode_id, '2026-04-01'::timestamptz, v_correction_time - INTERVAL '1 second') LOOP
    RAISE NOTICE '    yield_pct=% source=%', r.yield_pct, r.source;
    IF r.yield_pct = 1.0 AND r.source = 'industry_default' THEN
      RAISE NOTICE '    [4.2b] PASS';
    ELSE
      RAISE NOTICE '    [4.2b] FAIL';
    END IF;
  END LOOP;

  -- =========================================================================
  -- CLEANUP: herstel state naar pre-test
  -- =========================================================================
  DELETE FROM recipe_yield WHERE source = 'correction' AND correction_reason = 'Test A.2 verificatie 4.2';
  UPDATE recipe_yield
  SET assertion_period = tstzrange(v_seed_lower, NULL, '[)')
  WHERE id = v_seed_id;

  -- Verify cleanup
  SELECT COUNT(*) INTO v_count FROM recipe_yield;
  IF v_count = 13 THEN
    RAISE NOTICE '[CLEANUP] PASS: 13 rijen, state hersteld';
  ELSE
    RAISE NOTICE '[CLEANUP] FAIL: % rijen (verwacht 13)', v_count;
  END IF;

  SELECT COUNT(*) INTO v_count FROM recipe_yield WHERE source != 'industry_default';
  IF v_count = 0 THEN
    RAISE NOTICE '[CLEANUP] PASS: alleen industry_default rijen';
  ELSE
    RAISE NOTICE '[CLEANUP] FAIL: % non-industry_default rijen', v_count;
  END IF;
END $$;