
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
SET search_path TO 'public'
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
  v_status text;
  v_accepted_with_issue boolean;
  v_qty numeric;
  v_la_id uuid;
  v_delta_base numeric;
  v_base_unit text;
  v_factor_status text;
  v_factor_source_to_set text;
  v_werkelijk_gewicht_g numeric;
  v_should_mutate_stock boolean;
  v_legacy_qty numeric;
  v_lot_id uuid;
  v_lot_notes text;
BEGIN
  SELECT * INTO v_receipt FROM goods_receipts WHERE id = _receipt_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'receipt_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_receipt.ontvangst_status IN ('ontvangen_compleet', 'ontvangen_met_afwijking', 'geannuleerd') THEN
    RAISE EXCEPTION 'already_confirmed' USING ERRCODE = 'P0001';
  END IF;
  IF NOT user_has_role_in_location(_user_id, v_receipt.location_id, ARRAY['owner','manager','kitchen']::location_role[]) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  FOR v_line_input IN SELECT * FROM jsonb_array_elements(_lines)
  LOOP
    SELECT * INTO v_line_db
    FROM goods_receipt_lines
    WHERE id = (v_line_input->>'line_id')::uuid AND goods_receipt_id = _receipt_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'line_not_found: %', v_line_input->>'line_id';
    END IF;

    v_status := v_line_input->>'status';
    v_accepted_with_issue := COALESCE((v_line_input->>'accepted_with_issue')::boolean, false);
    IF v_status NOT IN ('afwijking_beschadigd','afwijking_verkeerd') THEN
      v_accepted_with_issue := false;
    END IF;

    v_qty := COALESCE((v_line_input->>'hoeveelheid_ontvangen')::numeric, v_line_db.hoeveelheid_verwacht);

    v_la_id := NULLIF(v_line_input->>'leverancier_artikel_id','')::uuid;
    v_delta_base := NULLIF(v_line_input->>'delta_base','')::numeric;
    v_base_unit := v_line_input->>'base_unit';
    v_factor_status := COALESCE(v_line_input->>'factor_status', 'unknown');
    v_factor_source_to_set := NULLIF(v_line_input->>'factor_source_to_set','');
    v_werkelijk_gewicht_g := NULLIF(v_line_input->>'werkelijk_gewicht_g','')::numeric;

    v_should_mutate_stock := (v_status = 'akkoord' OR v_accepted_with_issue) AND v_line_db.ingredient_id IS NOT NULL;

    IF v_should_mutate_stock AND v_factor_status <> 'confirmed' THEN
      RAISE EXCEPTION 'factor_required: line %', v_line_db.id USING ERRCODE = 'P0001';
    END IF;
    IF v_should_mutate_stock AND (v_delta_base IS NULL OR v_base_unit IS NULL) THEN
      RAISE EXCEPTION 'factor_required: line % missing delta_base/base_unit', v_line_db.id USING ERRCODE = 'P0001';
    END IF;

    UPDATE goods_receipt_lines
    SET
      status = v_status::goods_receipt_line_status,
      hoeveelheid_ontvangen = v_qty,
      lotnummer = COALESCE(v_line_input->>'lotnummer', v_line_db.lotnummer),
      tht_datum = COALESCE((v_line_input->>'tht_datum')::date, v_line_db.tht_datum),
      afwijking_notitie = CASE
        WHEN v_accepted_with_issue
          THEN format('GEACCEPTEERD-MET-AFWIJKING: %s', COALESCE(v_line_input->>'afwijking_notitie',''))
        ELSE v_line_input->>'afwijking_notitie'
      END,
      afwijking_foto_url = v_line_input->>'afwijking_foto_url',
      leverancier_artikel_id = COALESCE(v_la_id, leverancier_artikel_id),
      werkelijk_gewicht_g = COALESCE(v_werkelijk_gewicht_g, werkelijk_gewicht_g),
      factor_status = v_factor_status,
      afgevinkt_at = now(),
      afgevinkt_door = _user_id,
      updated_at = now()
    WHERE id = v_line_db.id;

    IF v_status = 'akkoord' THEN
      v_count_akkoord := v_count_akkoord + 1;
    ELSE
      v_count_afwijking := v_count_afwijking + 1;
    END IF;

    IF v_should_mutate_stock THEN
      SELECT id, eenheid, base_unit INTO v_ingredient
      FROM ingredienten WHERE id = v_line_db.ingredient_id;

      v_lot_notes := CASE
        WHEN v_werkelijk_gewicht_g IS NOT NULL
          THEN format('Pakbon %s · werkelijk gewicht %.0f g/verpakking',
                      COALESCE(v_receipt.pakbon_nummer, _receipt_id::text), v_werkelijk_gewicht_g)
        WHEN v_accepted_with_issue
          THEN format('Pakbon %s (geaccepteerd met afwijking)',
                      COALESCE(v_receipt.pakbon_nummer, _receipt_id::text))
        ELSE format('Pakbon %s', COALESCE(v_receipt.pakbon_nummer, _receipt_id::text))
      END;

      -- a) stock_lots
      INSERT INTO stock_lots (
        ingredient_id, goods_receipt_id, goods_receipt_line_id,
        received_at, expires_at,
        initial_base, remaining_base, base_unit,
        notes
      ) VALUES (
        v_line_db.ingredient_id,
        _receipt_id,
        v_line_db.id,
        now(),
        COALESCE((v_line_input->>'tht_datum')::date, v_line_db.tht_datum),
        v_delta_base,
        v_delta_base,
        v_base_unit,
        v_lot_notes
      )
      RETURNING id INTO v_lot_id;

      -- b) stock_movements (append-only, gekoppeld aan lot)
      INSERT INTO stock_movements (
        ingredient_id, stock_lot_id,
        delta_base, base_unit,
        reason, reference_type, reference_id,
        occurred_at, created_by, notes
      ) VALUES (
        v_line_db.ingredient_id,
        v_lot_id,
        v_delta_base,
        v_base_unit,
        'goods_receipt',
        'goods_receipt_line',
        v_line_db.id,
        now(),
        _user_id,
        v_lot_notes
      );

      -- c) LEGACY parallel
      v_legacy_qty := CASE
        WHEN v_ingredient.base_unit IS NOT NULL AND v_ingredient.base_unit = v_base_unit
          THEN v_delta_base
        ELSE v_qty
      END;

      INSERT INTO voorraad_bewegingen (
        ingredient_id, type, hoeveelheid, bron,
        referentie_type, referentie_id, medewerker_id, opmerking
      ) VALUES (
        v_line_db.ingredient_id, 'IN', v_legacy_qty, 'pakbon',
        'goods_receipt_line', v_line_db.id, _user_id,
        CASE
          WHEN v_accepted_with_issue THEN format('Pakbon %s (geaccepteerd met afwijking)',
            COALESCE(v_receipt.pakbon_nummer, _receipt_id::text))
          ELSE format('Pakbon %s', COALESCE(v_receipt.pakbon_nummer, _receipt_id::text))
        END
      );

      UPDATE ingredienten
      SET voorraad = COALESCE(voorraad, 0) + v_legacy_qty, updated_at = now()
      WHERE id = v_line_db.ingredient_id;

      v_voorraad_movements := v_voorraad_movements + 1;

      -- d) LEARNING LOOP
      IF v_la_id IS NOT NULL THEN
        UPDATE leveranciers_artikelen
        SET
          confirmation_count = COALESCE(confirmation_count, 0) + 1,
          last_confirmed_at = now(),
          factor_source = CASE
            WHEN factor_source = 'user' THEN 'user'
            WHEN v_factor_source_to_set IS NOT NULL THEN v_factor_source_to_set
            ELSE factor_source
          END,
          updated_at = now()
        WHERE id = v_la_id;
      END IF;
    END IF;

    IF v_status <> 'akkoord' THEN
      v_credit_type := CASE v_status
        WHEN 'afwijking_missing'    THEN 'missing'::credit_note_type
        WHEN 'afwijking_beschadigd' THEN 'beschadigd'::credit_note_type
        WHEN 'afwijking_verkeerd'   THEN 'verkeerd'::credit_note_type
        WHEN 'afwijking_meer'       THEN 'meer_dan_besteld'::credit_note_type
      END;
      v_dedup_key := format('%s:%s:%s', _receipt_id, v_line_db.id, v_credit_type);
      INSERT INTO credit_note_requests (
        goods_receipt_id, goods_receipt_line_id, leverancier_id, location_id,
        type, status, aantal, eenheid, notities, dedup_key
      ) VALUES (
        _receipt_id, v_line_db.id, v_receipt.leverancier_id, v_receipt.location_id,
        v_credit_type, 'open', v_qty, v_line_db.eenheid_verwacht,
        CASE
          WHEN v_accepted_with_issue THEN format('GEACCEPTEERD: %s', COALESCE(v_line_input->>'afwijking_notitie',''))
          ELSE v_line_input->>'afwijking_notitie'
        END,
        v_dedup_key
      )
      ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING;
      v_credit_notes := v_credit_notes + 1;
    END IF;
  END LOOP;

  -- Temperatuur (ongewijzigd)
  IF _temp_gekoeld IS NOT NULL THEN
    SELECT MIN(i.haccp_strict_temp_max) INTO v_strict_temp_threshold
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

  IF _temp_gekoeld IS NOT NULL THEN
    v_temp_in_range := _temp_gekoeld <= 7;
    v_actie_vereist := v_strict_temp_alarm OR NOT v_temp_in_range;
    v_actie_beschrijving := CASE
      WHEN v_strict_temp_alarm THEN format('Risicogroep-product gemeten op %s°C (strict max %s°C). Direct controleren of product nog veilig is.',_temp_gekoeld, v_strict_temp_threshold)
      WHEN NOT v_temp_in_range THEN format('Gekoeld %s°C boven max 7°C. Controleer koeling.', _temp_gekoeld)
      ELSE NULL
    END;
    INSERT INTO temperatuur_registraties (
      location_id, locatie_naam, type, temperatuur, in_range,
      max_temp, actie_vereist, actie_beschrijving, gemeten_door
    ) VALUES (
      v_receipt.location_id, 'Pakbon ontvangst (gekoeld)', 'koeling', _temp_gekoeld,
      v_temp_in_range AND NOT v_strict_temp_alarm, COALESCE(v_strict_temp_threshold, 7),
      v_actie_vereist, v_actie_beschrijving, _user_id
    );
    v_temp_registrations := v_temp_registrations + 1;
  END IF;

  IF _temp_vries IS NOT NULL THEN
    v_temp_in_range := _temp_vries <= -18;
    INSERT INTO temperatuur_registraties (
      location_id, locatie_naam, type, temperatuur, in_range,
      max_temp, actie_vereist, actie_beschrijving, gemeten_door
    ) VALUES (
      v_receipt.location_id, 'Pakbon ontvangst (vries)', 'vriezer', _temp_vries,
      v_temp_in_range, -18, NOT v_temp_in_range,
      CASE WHEN NOT v_temp_in_range THEN format('Vries %s°C boven max -18°C. Controleer vriezer.', _temp_vries) ELSE NULL END,
      _user_id
    );
    v_temp_registrations := v_temp_registrations + 1;
  END IF;

  INSERT INTO checklist_runs (
    location_id, template_id, datum, status,
    gestart_door, gestart_op, afgerond_door, afgerond_op,
    items_snapshot, opmerkingen
  ) VALUES (
    v_receipt.location_id, v_template_id, CURRENT_DATE, 'afgerond',
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

  INSERT INTO checklist_responses (run_id, item_id, type, checked, ingevuld_door, ingevuld_op)
  VALUES
    (v_checklist_run_id, 'verpakking_intact', 'check', true, _user_id, now()),
    (v_checklist_run_id, 'tht_gecontroleerd', 'check', true, _user_id, now());

  IF _temp_gekoeld IS NOT NULL THEN
    INSERT INTO checklist_responses (run_id, item_id, type, temperatuur, temp_in_range, ingevuld_door, ingevuld_op)
    VALUES (v_checklist_run_id, 'temp_gekoeld', 'temperatuur', _temp_gekoeld, (_temp_gekoeld <= 7) AND NOT v_strict_temp_alarm, _user_id, now());
  ELSIF _temp_skip ? 'gekoeld' THEN
    INSERT INTO checklist_responses (run_id, item_id, type, notitie, ingevuld_door, ingevuld_op)
    VALUES (v_checklist_run_id, 'temp_gekoeld', 'notitie', format('OVERGESLAGEN: %s', _temp_skip->>'gekoeld'), _user_id, now());
  END IF;

  IF _temp_vries IS NOT NULL THEN
    INSERT INTO checklist_responses (run_id, item_id, type, temperatuur, temp_in_range, ingevuld_door, ingevuld_op)
    VALUES (v_checklist_run_id, 'temp_vries', 'temperatuur', _temp_vries, _temp_vries <= -18, _user_id, now());
  ELSIF _temp_skip ? 'vries' THEN
    INSERT INTO checklist_responses (run_id, item_id, type, notitie, ingevuld_door, ingevuld_op)
    VALUES (v_checklist_run_id, 'temp_vries', 'notitie', format('OVERGESLAGEN: %s', _temp_skip->>'vries'), _user_id, now());
  END IF;

  v_new_receipt_status := CASE
    WHEN v_count_afwijking > 0 THEN 'ontvangen_met_afwijking'::goods_receipt_status
    ELSE 'ontvangen_compleet'::goods_receipt_status
  END;

  UPDATE goods_receipts
  SET
    ontvangst_status = v_new_receipt_status,
    ontvangen_at = now(), ontvangen_door = _user_id,
    temp_gekoeld_gemeten = _temp_gekoeld, temp_vries_gemeten = _temp_vries,
    temp_gemeten_at = CASE WHEN _temp_gekoeld IS NOT NULL OR _temp_vries IS NOT NULL THEN now() ELSE temp_gemeten_at END,
    temp_gemeten_door = CASE WHEN _temp_gekoeld IS NOT NULL OR _temp_vries IS NOT NULL THEN _user_id ELSE temp_gemeten_door END,
    heeft_strict_temp_alarm = v_strict_temp_alarm,
    totaal_regels_akkoord = v_count_akkoord, totaal_regels_afwijking = v_count_afwijking,
    updated_at = now()
  WHERE id = _receipt_id;

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
