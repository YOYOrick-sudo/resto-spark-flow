-- ============================================================================
-- ETAPPE 2C-1: confirm_goods_receipt RPC + scheduler skip-check
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Scheduler update: skip on_demand / scheduler_skip templates
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_daily_checklist_runs_for_date(_target_date date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tpl RECORD;
  itm jsonb;
  today date := _target_date;
  due_items jsonb;
  overdue_items jsonb;
  combined_snapshot jsonb;
  effective_freq text;
  effective_config jsonb;
  overdue_item_ids text[];
  template_due boolean;
  has_own_freq boolean;
  own_freq_item_ids text[];
  closed_locations uuid[];
BEGIN
  SELECT COALESCE(array_agg(DISTINCT l.id), ARRAY[]::uuid[]) INTO closed_locations
  FROM locations l
  WHERE
    EXISTS (
      SELECT 1 FROM location_operating_exceptions e
      WHERE e.location_id = l.id
        AND e.exception_date = today
        AND e.exception_type = 'closed'
        AND e.service_type = 'general'
    )
    OR (
      NOT EXISTS (
        SELECT 1 FROM location_operating_exceptions e
        WHERE e.location_id = l.id
          AND e.exception_date = today
          AND e.service_type = 'general'
      )
      AND NOT EXISTS (
        SELECT 1 FROM location_operating_hours h
        WHERE h.location_id = l.id
          AND h.day_of_week = EXTRACT(ISODOW FROM today)::int
          AND h.service_type = 'general'
      )
    );

  FOR tpl IN
    SELECT * FROM checklist_templates
    WHERE actief = true
      AND gearchiveerd_op IS NULL
      AND NOT (location_id = ANY(closed_locations))
      -- 2C-1: skip on_demand / scheduler_skip templates (e.g. Ontvangst goederen)
      AND COALESCE(frequentie_config->>'scheduler_skip', 'false') <> 'true'
      AND COALESCE(frequentie_config->>'trigger', '') <> 'on_demand'
  LOOP
    IF tpl.modus = 'gebundeld' THEN
      template_due := is_frequentie_due(tpl.frequentie, tpl.frequentie_config, today);
      due_items := '[]'::jsonb;
      own_freq_item_ids := ARRAY[]::text[];
      FOR itm IN SELECT * FROM jsonb_array_elements(tpl.items) LOOP
        has_own_freq := (itm ? 'item_frequentie') AND (itm->>'item_frequentie' IS NOT NULL);
        IF has_own_freq THEN
          effective_freq := itm->>'item_frequentie';
          effective_config := COALESCE(itm->'item_frequentie_config', '{}'::jsonb);
          own_freq_item_ids := own_freq_item_ids || (itm->>'id');
          IF is_frequentie_due(effective_freq, effective_config, today) THEN
            due_items := due_items || jsonb_build_array(jsonb_build_object('item_id', itm->>'id'));
          END IF;
        ELSE
          IF template_due THEN
            due_items := due_items || jsonb_build_array(jsonb_build_object('item_id', itm->>'id'));
          END IF;
        END IF;
      END LOOP;
      overdue_items := get_overdue_items(tpl.id, today);
      SELECT array_agg(due_item->>'item_id') INTO overdue_item_ids
        FROM jsonb_array_elements(due_items) AS due_item;
      SELECT COALESCE(jsonb_agg(ov), '[]'::jsonb) INTO overdue_items
        FROM jsonb_array_elements(overdue_items) AS ov
        WHERE (ov->>'item_id') = ANY(own_freq_item_ids)
          AND (overdue_item_ids IS NULL OR NOT ((ov->>'item_id') = ANY(overdue_item_ids)));
      combined_snapshot := due_items || overdue_items;
      IF jsonb_array_length(combined_snapshot) > 0 THEN
        INSERT INTO checklist_runs (location_id, template_id, datum, status, items_snapshot)
        SELECT tpl.location_id, tpl.id, today, 'open', combined_snapshot
        WHERE NOT EXISTS (
          SELECT 1 FROM checklist_runs
          WHERE template_id = tpl.id AND datum = today AND shift IS NULL
        );
      END IF;
    ELSIF tpl.modus = 'per_item' THEN
      due_items := '[]'::jsonb;
      FOR itm IN SELECT * FROM jsonb_array_elements(tpl.items) LOOP
        IF itm->>'item_frequentie' IS NULL THEN CONTINUE; END IF;
        effective_freq := itm->>'item_frequentie';
        effective_config := COALESCE(itm->'item_frequentie_config', '{}'::jsonb);
        IF is_frequentie_due(effective_freq, effective_config, today) THEN
          due_items := due_items || jsonb_build_array(jsonb_build_object('item_id', itm->>'id'));
        END IF;
      END LOOP;
      overdue_items := get_overdue_items(tpl.id, today);
      combined_snapshot := due_items || overdue_items;
      IF jsonb_array_length(combined_snapshot) > 0 THEN
        INSERT INTO checklist_runs (location_id, template_id, datum, status, items_snapshot)
        SELECT tpl.location_id, tpl.id, today, 'open', combined_snapshot
        WHERE NOT EXISTS (
          SELECT 1 FROM checklist_runs
          WHERE template_id = tpl.id AND datum = today AND shift IS NULL
        );
      END IF;
    END IF;
  END LOOP;
END;
$function$;

-- ----------------------------------------------------------------------------
-- 2. RPC: confirm_goods_receipt
-- ----------------------------------------------------------------------------
-- Input shape (jsonb _lines):
-- [
--   {
--     "line_id": "uuid",
--     "status": "akkoord" | "afwijking_missing" | "afwijking_beschadigd"
--               | "afwijking_verkeerd" | "afwijking_meer",
--     "hoeveelheid_ontvangen": numeric (optional),
--     "lotnummer": text (optional),
--     "tht_datum": date (optional, ISO),
--     "afwijking_notitie": text (optional),
--     "afwijking_foto_url": text (optional)
--   }
-- ]
--
-- _temp_skip shape:
-- { "gekoeld": "reden_text" | null, "vries": "reden_text" | null }
--
-- Returns jsonb summary: {
--   receipt_id, new_status, count_akkoord, count_afwijking,
--   voorraad_movements, credit_notes_created, temp_registrations,
--   checklist_run_id, has_strict_temp_alarm, warnings: []
-- }

CREATE OR REPLACE FUNCTION public.confirm_goods_receipt(
  _receipt_id uuid,
  _user_id uuid,
  _lines jsonb,
  _temp_gekoeld numeric DEFAULT NULL,
  _temp_vries numeric DEFAULT NULL,
  _temp_skip jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_receipt RECORD;
  v_line_input jsonb;
  v_line_db RECORD;
  v_ingredient RECORD;
  v_count_akkoord int := 0;
  v_count_afwijking int := 0;
  v_voorraad_movements int := 0;
  v_credit_notes int := 0;
  v_temp_registrations int := 0;
  v_strict_temp_alarm boolean := false;
  v_strict_temp_threshold numeric := NULL;
  v_warnings jsonb := '[]'::jsonb;
  v_credit_type credit_note_type;
  v_temp_in_range boolean;
  v_actie_vereist boolean;
  v_actie_beschrijving text;
  v_checklist_run_id uuid;
  v_new_receipt_status goods_receipt_status;
  v_template_id constant uuid := '3380dd1a-1cf2-4c10-bf1b-8ad6502d7c9c';
  v_dedup_key text;
BEGIN
  -- ---- 1. Receipt fetch + permission + idempotency check ----
  SELECT * INTO v_receipt
  FROM goods_receipts
  WHERE id = _receipt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'receipt_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_receipt.ontvangst_status IN ('ontvangen_compleet', 'ontvangen_met_afwijking', 'geannuleerd') THEN
    RAISE EXCEPTION 'already_confirmed' USING ERRCODE = 'P0001';
  END IF;

  IF NOT user_has_role_in_location(
    _user_id,
    v_receipt.location_id,
    ARRAY['owner','manager','kitchen']::location_role[]
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- ---- 2. Process lines ----
  FOR v_line_input IN SELECT * FROM jsonb_array_elements(_lines)
  LOOP
    SELECT * INTO v_line_db
    FROM goods_receipt_lines
    WHERE id = (v_line_input->>'line_id')::uuid
      AND goods_receipt_id = _receipt_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'line_not_found: %', v_line_input->>'line_id';
    END IF;

    -- Update line
    UPDATE goods_receipt_lines
    SET
      status = (v_line_input->>'status')::goods_receipt_line_status,
      hoeveelheid_ontvangen = COALESCE(
        (v_line_input->>'hoeveelheid_ontvangen')::numeric,
        v_line_db.hoeveelheid_verwacht
      ),
      lotnummer = COALESCE(v_line_input->>'lotnummer', v_line_db.lotnummer),
      tht_datum = COALESCE((v_line_input->>'tht_datum')::date, v_line_db.tht_datum),
      afwijking_notitie = v_line_input->>'afwijking_notitie',
      afwijking_foto_url = v_line_input->>'afwijking_foto_url',
      afgevinkt_at = now(),
      afgevinkt_door = _user_id,
      updated_at = now()
    WHERE id = v_line_db.id;

    -- Branch: akkoord → voorraad, anders → credit-note
    IF (v_line_input->>'status') = 'akkoord' THEN
      v_count_akkoord := v_count_akkoord + 1;

      IF v_line_db.ingredient_id IS NOT NULL THEN
        INSERT INTO voorraad_bewegingen (
          ingredient_id, type, hoeveelheid, bron,
          referentie_type, referentie_id, medewerker_id, opmerking
        ) VALUES (
          v_line_db.ingredient_id,
          'levering_in',
          COALESCE(
            (v_line_input->>'hoeveelheid_ontvangen')::numeric,
            v_line_db.hoeveelheid_verwacht
          ),
          'pakbon',
          'goods_receipt_line',
          v_line_db.id,
          _user_id,
          format('Pakbon %s', COALESCE(v_receipt.pakbon_nummer, _receipt_id::text))
        );

        UPDATE ingredienten
        SET voorraad = voorraad + COALESCE(
              (v_line_input->>'hoeveelheid_ontvangen')::numeric,
              v_line_db.hoeveelheid_verwacht
            ),
            updated_at = now()
        WHERE id = v_line_db.ingredient_id;

        v_voorraad_movements := v_voorraad_movements + 1;
      END IF;
    ELSE
      v_count_afwijking := v_count_afwijking + 1;

      v_credit_type := CASE v_line_input->>'status'
        WHEN 'afwijking_missing'    THEN 'missing'::credit_note_type
        WHEN 'afwijking_beschadigd' THEN 'beschadigd'::credit_note_type
        WHEN 'afwijking_verkeerd'  THEN 'verkeerd'::credit_note_type
        WHEN 'afwijking_meer'      THEN 'meer_dan_besteld'::credit_note_type
      END;

      v_dedup_key := format('%s:%s:%s', _receipt_id, v_line_db.id, v_credit_type);

      INSERT INTO credit_note_requests (
        goods_receipt_id, goods_receipt_line_id, leverancier_id, location_id,
        type, status, aantal, eenheid, notities, dedup_key
      ) VALUES (
        _receipt_id, v_line_db.id, v_receipt.leverancier_id, v_receipt.location_id,
        v_credit_type, 'open',
        COALESCE(
          (v_line_input->>'hoeveelheid_ontvangen')::numeric,
          v_line_db.hoeveelheid_verwacht
        ),
        v_line_db.eenheid_verwacht,
        v_line_input->>'afwijking_notitie',
        v_dedup_key
      )
      ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;

      v_credit_notes := v_credit_notes + 1;
    END IF;
  END LOOP;

  -- ---- 3. Risicogroep strict temp check (gekoeld) ----
  -- Find strictest threshold among accepted gekoeld lines with strict temp set
  IF _temp_gekoeld IS NOT NULL THEN
    SELECT MIN(i.haccp_strict_temp_max)
    INTO v_strict_temp_threshold
    FROM goods_receipt_lines grl
    JOIN ingredienten i ON i.id = grl.ingredient_id
    WHERE grl.goods_receipt_id = _receipt_id
      AND grl.status = 'akkoord'
      AND i.haccp_strict_temp_max IS NOT NULL
      AND COALESCE(i.haccp_categorie::text, grl.haccp_categorie::text) IN ('gekoeld','vis_op_ijs');

    IF v_strict_temp_threshold IS NOT NULL AND _temp_gekoeld > v_strict_temp_threshold THEN
      v_strict_temp_alarm := true;
      v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
        'code', 'risicogroep_temp_te_hoog',
        'message', format('Gekoeld %s°C > strict max %s°C voor risicogroep-product',
                          _temp_gekoeld, v_strict_temp_threshold),
        'threshold', v_strict_temp_threshold
      ));
    END IF;
  END IF;

  -- ---- 4. Temperature registrations ----
  IF _temp_gekoeld IS NOT NULL THEN
    v_temp_in_range := _temp_gekoeld <= 7;
    v_actie_vereist := v_strict_temp_alarm OR NOT v_temp_in_range;
    v_actie_beschrijving := CASE
      WHEN v_strict_temp_alarm THEN
        format('Risicogroep-product gemeten op %s°C (strict max %s°C). Direct controleren of product nog veilig is.',
               _temp_gekoeld, v_strict_temp_threshold)
      WHEN NOT v_temp_in_range THEN
        format('Gekoeld %s°C boven max 7°C. Controleer koeling.', _temp_gekoeld)
      ELSE NULL
    END;

    INSERT INTO temperatuur_registraties (
      location_id, locatie_naam, type, temperatuur, in_range,
      max_temp, actie_vereist, actie_beschrijving, gemeten_door
    ) VALUES (
      v_receipt.location_id,
      'Pakbon ontvangst (gekoeld)',
      'koeling',
      _temp_gekoeld,
      v_temp_in_range AND NOT v_strict_temp_alarm,
      COALESCE(v_strict_temp_threshold, 7),
      v_actie_vereist,
      v_actie_beschrijving,
      _user_id
    );
    v_temp_registrations := v_temp_registrations + 1;
  END IF;

  IF _temp_vries IS NOT NULL THEN
    v_temp_in_range := _temp_vries <= -18;
    INSERT INTO temperatuur_registraties (
      location_id, locatie_naam, type, temperatuur, in_range,
      max_temp, actie_vereist, actie_beschrijving, gemeten_door
    ) VALUES (
      v_receipt.location_id,
      'Pakbon ontvangst (vries)',
      'vriezer',
      _temp_vries,
      v_temp_in_range,
      -18,
      NOT v_temp_in_range,
      CASE WHEN NOT v_temp_in_range
           THEN format('Vries %s°C boven max -18°C. Controleer vriezer.', _temp_vries)
           ELSE NULL END,
      _user_id
    );
    v_temp_registrations := v_temp_registrations + 1;
  END IF;

  -- ---- 5. Checklist run (auto-completed) ----
  INSERT INTO checklist_runs (
    location_id, template_id, datum, status,
    gestart_door, gestart_op, afgerond_door, afgerond_op,
    items_snapshot, opmerkingen
  ) VALUES (
    v_receipt.location_id,
    v_template_id,
    CURRENT_DATE,
    'afgerond',
    _user_id, now(), _user_id, now(),
    jsonb_build_array(
      jsonb_build_object('item_id','verpakking_intact'),
      jsonb_build_object('item_id','tht_gecontroleerd'),
      jsonb_build_object('item_id','temp_gekoeld'),
      jsonb_build_object('item_id','temp_vries'),
      jsonb_build_object('item_id','opmerking')
    ),
    format('Auto-aangemaakt via pakbon-bevestiging (receipt %s)', _receipt_id)
  )
  RETURNING id INTO v_checklist_run_id;

  -- Responses
  INSERT INTO checklist_responses (run_id, item_id, type, checked, ingevuld_door, ingevuld_op)
  VALUES
    (v_checklist_run_id, 'verpakking_intact', 'checkbox', true, _user_id, now()),
    (v_checklist_run_id, 'tht_gecontroleerd', 'checkbox', true, _user_id, now());

  -- Temp gekoeld response (or skip)
  IF _temp_gekoeld IS NOT NULL THEN
    INSERT INTO checklist_responses (run_id, item_id, type, temperatuur, temp_in_range, ingevuld_door, ingevuld_op)
    VALUES (v_checklist_run_id, 'temp_gekoeld', 'temperatuur', _temp_gekoeld,
            (_temp_gekoeld <= 7) AND NOT v_strict_temp_alarm, _user_id, now());
  ELSIF _temp_skip ? 'gekoeld' THEN
    INSERT INTO checklist_responses (run_id, item_id, type, notitie, ingevuld_door, ingevuld_op)
    VALUES (v_checklist_run_id, 'temp_gekoeld', 'temperatuur',
            format('OVERGESLAGEN: %s', _temp_skip->>'gekoeld'), _user_id, now());
  END IF;

  -- Temp vries response (or skip)
  IF _temp_vries IS NOT NULL THEN
    INSERT INTO checklist_responses (run_id, item_id, type, temperatuur, temp_in_range, ingevuld_door, ingevuld_op)
    VALUES (v_checklist_run_id, 'temp_vries', 'temperatuur', _temp_vries,
            _temp_vries <= -18, _user_id, now());
  ELSIF _temp_skip ? 'vries' THEN
    INSERT INTO checklist_responses (run_id, item_id, type, notitie, ingevuld_door, ingevuld_op)
    VALUES (v_checklist_run_id, 'temp_vries', 'temperatuur',
            format('OVERGESLAGEN: %s', _temp_skip->>'vries'), _user_id, now());
  END IF;

  -- ---- 6. Update goods_receipts ----
  v_new_receipt_status := CASE
    WHEN v_count_afwijking > 0 THEN 'ontvangen_met_afwijking'::goods_receipt_status
    ELSE 'ontvangen_compleet'::goods_receipt_status
  END;

  UPDATE goods_receipts
  SET
    ontvangst_status = v_new_receipt_status,
    ontvangen_at = now(),
    ontvangen_door = _user_id,
    temp_gekoeld_gemeten = _temp_gekoeld,
    temp_vries_gemeten = _temp_vries,
    temp_gemeten_at = CASE WHEN _temp_gekoeld IS NOT NULL OR _temp_vries IS NOT NULL THEN now() ELSE temp_gemeten_at END,
    temp_gemeten_door = CASE WHEN _temp_gekoeld IS NOT NULL OR _temp_vries IS NOT NULL THEN _user_id ELSE temp_gemeten_door END,
    heeft_strict_temp_alarm = v_strict_temp_alarm,
    totaal_regels_akkoord = v_count_akkoord,
    totaal_regels_afwijking = v_count_afwijking,
    updated_at = now()
  WHERE id = _receipt_id;

  -- ---- 7. Return summary ----
  RETURN jsonb_build_object(
    'receipt_id', _receipt_id,
    'location_id', v_receipt.location_id,
    'new_status', v_new_receipt_status,
    'count_akkoord', v_count_akkoord,
    'count_afwijking', v_count_afwijking,
    'voorraad_movements', v_voorraad_movements,
    'credit_notes_created', v_credit_notes,
    'temp_registrations', v_temp_registrations,
    'checklist_run_id', v_checklist_run_id,
    'has_strict_temp_alarm', v_strict_temp_alarm,
    'warnings', v_warnings
  );
END;
$function$;

-- Service-role only
REVOKE ALL ON FUNCTION public.confirm_goods_receipt(uuid, uuid, jsonb, numeric, numeric, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_goods_receipt(uuid, uuid, jsonb, numeric, numeric, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.confirm_goods_receipt(uuid, uuid, jsonb, numeric, numeric, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_goods_receipt(uuid, uuid, jsonb, numeric, numeric, jsonb) TO service_role;