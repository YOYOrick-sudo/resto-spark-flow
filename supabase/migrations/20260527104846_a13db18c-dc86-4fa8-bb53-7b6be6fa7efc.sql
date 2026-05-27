
-- ============================================================================
-- Etappe 2: complete_mep_task RPC + unit-conversie helpers + audit kolommen
-- ============================================================================

-- 1. mep_task_completions: base-eenheid kolommen (Optie B)
ALTER TABLE public.mep_task_completions
  ADD COLUMN IF NOT EXISTS verwachte_output_base numeric,
  ADD COLUMN IF NOT EXISTS werkelijke_output_base numeric,
  ADD COLUMN IF NOT EXISTS output_base_unit text;

-- 2. productie_batches: kost per output-eenheid
ALTER TABLE public.productie_batches
  ADD COLUMN IF NOT EXISTS unit_cost_eur numeric;

-- 3. Unit-dictionary helper (NL+EN, idem _shared/conversions/index.ts)
CREATE OR REPLACE FUNCTION public.unit_to_base(_unit text)
RETURNS TABLE(base text, factor numeric)
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT base::text, factor::numeric FROM (VALUES
    ('mg','g',0.001),('g','g',1),('gr','g',1),('gram','g',1),('grammen','g',1),
    ('kg','g',1000),('kilo','g',1000),('kilogram','g',1000),
    ('ml','ml',1),('milliliter','ml',1),('cl','ml',10),('centiliter','ml',10),
    ('dl','ml',100),('deciliter','ml',100),
    ('l','ml',1000),('ltr','ml',1000),('liter','ml',1000),
    ('el','ml',15),('eetlepel','ml',15),('eetlepels','ml',15),
    ('tl','ml',5),('theelepel','ml',5),('theelepels','ml',5),
    ('kop','ml',240),('koppen','ml',240),
    ('snufje','g',0.4),('mespunt','g',0.5),('scheutje','ml',15),
    ('st','st',1),('stuk','st',1),('stuks','st',1),
    ('bos','st',1),('bossen','st',1),('bundel','st',1),('bundels','st',1),
    ('teen','st',1),('teentje','st',1),('teentjes','st',1)
  ) v(u, base, factor)
  WHERE u = lower(regexp_replace(trim(COALESCE(_unit,'')), '\.$', ''));
$$;

-- 4. to_base_unit: converteer qty in willekeurige unit naar gegeven target base ('g'|'ml'|'st')
CREATE OR REPLACE FUNCTION public.to_base_unit(
  _qty numeric,
  _unit text,
  _target_base text,
  _weight_per_piece_g numeric,
  _density_g_per_ml numeric
) RETURNS numeric
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_src_base text;
  v_src_factor numeric;
  v_value numeric;
  v_density numeric := COALESCE(_density_g_per_ml, 1);
BEGIN
  IF _qty IS NULL OR _unit IS NULL OR _target_base IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT base, factor INTO v_src_base, v_src_factor FROM public.unit_to_base(_unit);
  IF v_src_base IS NULL THEN
    RAISE EXCEPTION 'Unknown unit: %', _unit USING ERRCODE='22023';
  END IF;
  v_value := _qty * v_src_factor;  -- in v_src_base
  IF v_src_base = _target_base THEN
    RETURN round(v_value, 4);
  END IF;
  -- direct bridges
  IF v_src_base='g' AND _target_base='ml' THEN
    IF v_density<=0 THEN RAISE EXCEPTION 'density_g_per_ml > 0 vereist'; END IF;
    RETURN round(v_value / v_density, 4);
  ELSIF v_src_base='ml' AND _target_base='g' THEN
    RETURN round(v_value * v_density, 4);
  ELSIF v_src_base='g' AND _target_base='st' THEN
    IF _weight_per_piece_g IS NULL OR _weight_per_piece_g<=0 THEN
      RAISE EXCEPTION 'weight_per_piece_g vereist voor g↔st conversie';
    END IF;
    RETURN round(v_value / _weight_per_piece_g, 4);
  ELSIF v_src_base='st' AND _target_base='g' THEN
    IF _weight_per_piece_g IS NULL OR _weight_per_piece_g<=0 THEN
      RAISE EXCEPTION 'weight_per_piece_g vereist voor g↔st conversie';
    END IF;
    RETURN round(v_value * _weight_per_piece_g, 4);
  -- chained via gram
  ELSIF v_src_base='ml' AND _target_base='st' THEN
    RETURN public.to_base_unit(v_value * v_density, 'g', 'st', _weight_per_piece_g, _density_g_per_ml);
  ELSIF v_src_base='st' AND _target_base='ml' THEN
    IF _weight_per_piece_g IS NULL OR _weight_per_piece_g<=0 THEN
      RAISE EXCEPTION 'weight_per_piece_g vereist';
    END IF;
    RETURN public.to_base_unit(v_value * _weight_per_piece_g, 'g', 'ml', _weight_per_piece_g, _density_g_per_ml);
  END IF;
  RAISE EXCEPTION 'Unsupported base bridge %→%', v_src_base, _target_base;
END $$;

-- 5. convert_qty: van willekeurige unit → willekeurige unit (via ingredient meta)
CREATE OR REPLACE FUNCTION public.convert_qty(
  _qty numeric,
  _from_unit text,
  _to_unit text,
  _weight_per_piece_g numeric,
  _density_g_per_ml numeric
) RETURNS numeric
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_to_base text; v_to_factor numeric;
  v_in_target_base numeric;
BEGIN
  IF _qty IS NULL THEN RETURN NULL; END IF;
  SELECT base, factor INTO v_to_base, v_to_factor FROM public.unit_to_base(_to_unit);
  IF v_to_base IS NULL THEN
    RAISE EXCEPTION 'Unknown unit: %', _to_unit USING ERRCODE='22023';
  END IF;
  v_in_target_base := public.to_base_unit(_qty, _from_unit, v_to_base, _weight_per_piece_g, _density_g_per_ml);
  RETURN round(v_in_target_base / v_to_factor, 4);
END $$;

-- 6. auto_deplete trigger: respecteer skip-flag zodat RPC niet dubbel-deplet
CREATE OR REPLACE FUNCTION public.auto_deplete_ingredients()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_recept_id UUID;
  v_porties NUMERIC;
  r RECORD;
BEGIN
  -- Skip wanneer RPC complete_mep_task de boekingen zelf doet
  IF COALESCE(current_setting('app.skip_auto_deplete', true), 'off') = 'on' THEN
    RETURN NEW;
  END IF;

  SELECT mt.recept_id INTO v_recept_id FROM public.mep_tasks mt WHERE mt.id = NEW.task_id;
  IF v_recept_id IS NULL THEN RETURN NEW; END IF;

  SELECT re.porties INTO v_porties FROM public.recepten re WHERE re.id = v_recept_id;
  v_porties := COALESCE(v_porties, 1);

  FOR r IN
    SELECT ri.ingredient_id, ri.hoeveelheid
    FROM public.recept_ingredienten ri
    WHERE ri.recept_id = v_recept_id
  LOOP
    INSERT INTO public.voorraad_bewegingen (
      ingredient_id, type, hoeveelheid, bron, referentie_type, referentie_id, medewerker_id
    ) VALUES (
      r.ingredient_id, 'OUT',
      -(r.hoeveelheid * NEW.units_gemaakt / v_porties),
      'Productie', 'mep_task', NEW.task_id, NEW.medewerker_id
    );
    UPDATE public.ingredienten
    SET voorraad = voorraad + (-(r.hoeveelheid * NEW.units_gemaakt / v_porties))
    WHERE id = r.ingredient_id;
  END LOOP;
  RETURN NEW;
END;
$function$;

-- 7. complete_mep_task RPC — atomic: inputs (mét unit-conversie) + output + batch
CREATE OR REPLACE FUNCTION public.complete_mep_task(
  _task_id uuid,
  _units_gemaakt numeric,
  _werkelijke_output numeric DEFAULT NULL,
  _werkelijke_output_unit text DEFAULT NULL,
  _temperatuur numeric DEFAULT NULL,
  _kok_medewerker_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_task RECORD;
  v_methode RECORD;
  v_porties numeric;
  v_hf_ing RECORD;
  v_batch_nummer text;
  v_completion_id uuid;
  v_output_unit text;
  v_output_qty numeric;
  v_verwachte_qty numeric;
  v_output_base text;
  v_werkelijke_base numeric;
  v_verwachte_base numeric;
  v_amount_in_hf_eenheid numeric;
  v_input_cost_total numeric := 0;
  v_houdbaar_tot date;
  r RECORD;
  v_input_in_ing_eenheid numeric;
  v_input_base numeric;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Niet ingelogd' USING ERRCODE='28000';
  END IF;
  IF _units_gemaakt IS NULL OR _units_gemaakt <= 0 THEN
    RAISE EXCEPTION 'units_gemaakt moet > 0 zijn';
  END IF;

  -- task + methode
  SELECT * INTO v_task FROM public.mep_tasks WHERE id = _task_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MEP-taak niet gevonden'; END IF;
  IF v_task.status = 'completed' THEN
    RAISE EXCEPTION 'MEP-taak is al afgerond' USING ERRCODE='22023';
  END IF;

  IF v_task.methode_id IS NOT NULL THEN
    SELECT * INTO v_methode FROM public.halffabricaat_methodes WHERE id = v_task.methode_id;
  END IF;

  -- porties van recept (default 1)
  IF v_task.recept_id IS NOT NULL THEN
    SELECT COALESCE(porties,1) INTO v_porties FROM public.recepten WHERE id = v_task.recept_id;
  END IF;
  v_porties := COALESCE(v_porties, 1);

  -- batch nummer
  SELECT public.generate_batch_nummer(v_task.location_id) INTO v_batch_nummer;

  -- output-eenheid + base
  IF v_methode.id IS NOT NULL THEN
    v_output_unit := COALESCE(_werkelijke_output_unit, v_methode.output_eenheid);
    v_verwachte_qty := v_methode.output_hoeveelheid * _units_gemaakt;  -- in methode.output_eenheid
    v_output_qty := COALESCE(_werkelijke_output, v_verwachte_qty);

    -- Halffabricaat-ingredient ophalen (uniek per recept via uq_ingredienten_recept)
    SELECT * INTO v_hf_ing
    FROM public.ingredienten
    WHERE recept_id = v_task.recept_id AND is_halffabricaat = true AND is_archived = false
    LIMIT 1;

    IF v_hf_ing.id IS NOT NULL THEN
      v_output_base := v_hf_ing.base_unit;
      v_verwachte_base := public.to_base_unit(
        v_verwachte_qty, v_methode.output_eenheid, v_output_base,
        v_hf_ing.weight_per_piece_g, v_hf_ing.density_g_per_ml
      );
      v_werkelijke_base := public.to_base_unit(
        v_output_qty, v_output_unit, v_output_base,
        v_hf_ing.weight_per_piece_g, v_hf_ing.density_g_per_ml
      );
    END IF;

    IF v_methode.houdbaarheid IS NOT NULL THEN
      v_houdbaar_tot := (CURRENT_DATE + (v_methode.houdbaarheid || ' days')::interval)::date;
    END IF;
  END IF;

  -- ── Zet skip-flag zodat trg_auto_deplete niet dubbel boekt
  PERFORM set_config('app.skip_auto_deplete', 'on', true);

  -- completion FIRST (krijgt id voor productie_batches)
  INSERT INTO public.mep_task_completions (
    task_id, medewerker_id, kok_medewerker_id, units_gemaakt,
    verwachte_output_gram, werkelijke_output_gram,
    verwachte_output_base, werkelijke_output_base, output_base_unit,
    yield_percentage, temperatuur, batch_nummer
  ) VALUES (
    _task_id, v_user_id, _kok_medewerker_id, _units_gemaakt,
    -- legacy _gram velden: alleen vullen als output base = 'g' (backward-compat)
    CASE WHEN v_output_base = 'g' THEN v_verwachte_base END,
    CASE WHEN v_output_base = 'g' THEN v_werkelijke_base END,
    v_verwachte_base, v_werkelijke_base, v_output_base,
    CASE WHEN v_verwachte_base IS NOT NULL AND v_verwachte_base > 0 AND v_werkelijke_base IS NOT NULL
         THEN round(v_werkelijke_base / v_verwachte_base * 100, 2) END,
    _temperatuur, v_batch_nummer
  )
  RETURNING id INTO v_completion_id;

  -- ── INPUTS: aftrekken mét unit-conversie naar ing.eenheid (display unit)
  IF v_task.recept_id IS NOT NULL THEN
    FOR r IN
      SELECT ri.ingredient_id, ri.hoeveelheid, ri.eenheid AS ri_eenheid,
             ing.eenheid AS ing_eenheid, ing.base_unit, ing.weight_per_piece_g,
             ing.density_g_per_ml, ing.kostprijs, ing.naam
      FROM public.recept_ingredienten ri
      JOIN public.ingredienten ing ON ing.id = ri.ingredient_id
      WHERE ri.recept_id = v_task.recept_id
    LOOP
      v_input_in_ing_eenheid := public.convert_qty(
        r.hoeveelheid * _units_gemaakt / v_porties,
        r.ri_eenheid, r.ing_eenheid,
        r.weight_per_piece_g, r.density_g_per_ml
      );

      v_input_base := public.to_base_unit(
        r.hoeveelheid * _units_gemaakt / v_porties,
        r.ri_eenheid, r.base_unit,
        r.weight_per_piece_g, r.density_g_per_ml
      );

      INSERT INTO public.voorraad_bewegingen (
        ingredient_id, type, hoeveelheid, bron, referentie_type, referentie_id, medewerker_id, opmerking
      ) VALUES (
        r.ingredient_id, 'OUT', -v_input_in_ing_eenheid, 'MEP',
        'mep_task_completion', v_completion_id, v_user_id,
        'MEP input · ' || r.naam || ' · ' || v_input_base::text || ' ' || r.base_unit
      );

      UPDATE public.ingredienten
      SET voorraad = voorraad - v_input_in_ing_eenheid,
          updated_at = now()
      WHERE id = r.ingredient_id;

      v_input_cost_total := v_input_cost_total + (v_input_in_ing_eenheid * COALESCE(r.kostprijs, 0));
    END LOOP;
  END IF;

  -- ── OUTPUT: halffabricaat-ingredient ophogen (in hf.eenheid)
  IF v_hf_ing.id IS NOT NULL THEN
    v_amount_in_hf_eenheid := public.convert_qty(
      v_output_qty, v_output_unit, v_hf_ing.eenheid,
      v_hf_ing.weight_per_piece_g, v_hf_ing.density_g_per_ml
    );

    INSERT INTO public.voorraad_bewegingen (
      ingredient_id, type, hoeveelheid, bron, referentie_type, referentie_id, medewerker_id, opmerking
    ) VALUES (
      v_hf_ing.id, 'IN', v_amount_in_hf_eenheid, 'MEP',
      'mep_task_completion', v_completion_id, v_user_id,
      'MEP output · batch ' || v_batch_nummer
    );

    UPDATE public.ingredienten
    SET voorraad = voorraad + v_amount_in_hf_eenheid,
        updated_at = now()
    WHERE id = v_hf_ing.id;

    -- productie_batches log met unit_cost
    INSERT INTO public.productie_batches (
      location_id, batch_nummer, recept_id, methode_id,
      productie_datum, houdbaar_tot, hoeveelheid, eenheid,
      medewerker_id, task_completion_id, unit_cost_eur
    ) VALUES (
      v_task.location_id, v_batch_nummer, v_task.recept_id, v_methode.id,
      CURRENT_DATE, v_houdbaar_tot, v_amount_in_hf_eenheid, v_hf_ing.eenheid,
      v_user_id, v_completion_id,
      CASE WHEN v_amount_in_hf_eenheid > 0
           THEN round(v_input_cost_total / v_amount_in_hf_eenheid, 6) END
    );
  END IF;

  -- ── STAP 7 — Halffabricaat-kostprijs boeking (Optie 1 — BEWUST NIET)
  -- Reden: productie_batches.unit_cost_eur blijft single source of truth voor
  --   werkelijke kost. ingredienten.kostprijs van het halffabricaat blijft NULL.
  --   Recept-snapshot (kostprijs_snapshot in gerecht_componenten) blijft theoretisch
  --   gedreven vanuit recepten.totale_kostprijs. Geen drift tijdens testfase.
  -- Upgrade-pad naar Optie 2 (running-average op ing.kostprijs) is additief:
  --   UPDATE public.ingredienten
  --   SET kostprijs = ((voorraad_voor * COALESCE(kostprijs,0) + v_amount_in_hf_eenheid * unit_cost)
  --                    / NULLIF(voorraad_voor + v_amount_in_hf_eenheid, 0)),
  --       kostprijs_bron = 'mep_running_avg',
  --       kostprijs_laatst_bijgewerkt = now()
  --   WHERE id = v_hf_ing.id;

  -- Taak op completed
  UPDATE public.mep_tasks
  SET status = 'completed', updated_at = now()
  WHERE id = _task_id;

  PERFORM set_config('app.skip_auto_deplete', 'off', true);

  RETURN jsonb_build_object(
    'batch_nummer', v_batch_nummer,
    'completion_id', v_completion_id,
    'output_base_unit', v_output_base,
    'verwachte_output_base', v_verwachte_base,
    'werkelijke_output_base', v_werkelijke_base,
    'output_in_eenheid', v_amount_in_hf_eenheid,
    'input_cost_total', v_input_cost_total,
    'unit_cost_eur', CASE WHEN v_amount_in_hf_eenheid > 0
                          THEN round(v_input_cost_total / v_amount_in_hf_eenheid, 6) END
  );
END $$;

REVOKE ALL ON FUNCTION public.complete_mep_task(uuid, numeric, numeric, text, numeric, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_mep_task(uuid, numeric, numeric, text, numeric, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unit_to_base(text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.to_base_unit(numeric, text, text, numeric, numeric) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.convert_qty(numeric, text, text, numeric, numeric) TO authenticated, anon, service_role;
