CREATE OR REPLACE FUNCTION public.confirm_goods_receipt(_receipt_id uuid, _user_id uuid, _lines jsonb, _temp_gekoeld numeric DEFAULT NULL::numeric, _temp_vries numeric DEFAULT NULL::numeric, _temp_skip jsonb DEFAULT '{}'::jsonb)
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
BEGIN
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

    IF (v_line_input->>'status') = 'akkoord' THEN
      v_count_akkoord := v_count_akkoord + 1;

      IF v_line_db.ingredient_id IS NOT NULL THEN
        INSERT INTO voorraad_bewegingen (
          ingredient_id, type, hoeveelheid, bron,
          referentie_type, referentie_id, medewerker_id, opmerking
        ) VALUES (
          v_line_db.ingredient_id,
          'IN',
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

  INSERT INTO checklist_responses (run_id, item_id, type, checked, ingevuld_door, ingevuld_op)
  VALUES
    (v_checklist_run_id, 'verpakking_intact', 'checkbox', true, _user_id, now()),
    (v_checklist_run_id, 'tht_gecontroleerd', 'checkbox', true, _user_id, now());

  IF _temp_gekoeld IS NOT NULL THEN
    INSERT INTO checklist_responses (run_id, item_id, type, temperatuur, temp_in_range, ingevuld_door, ingevuld_op)
    VALUES (v_checklist_run_id, 'temp_gekoeld', 'temperatuur', _temp_gekoeld,
            (_temp_gekoeld <= 7) AND NOT v_strict_temp_alarm, _user_id, now());
  ELSIF _temp_skip ? 'gekoeld' THEN
    INSERT INTO checklist_responses (run_id, item_id, type, notitie, ingevuld_door, ingevuld_op)
    VALUES (v_checklist_run_id, 'temp_gekoeld', 'temperatuur',
            format('OVERGESLAGEN: %s', _temp_skip->>'gekoeld'), _user_id, now());
  END IF;

  IF _temp_vries IS NOT NULL THEN
    INSERT INTO checklist_responses (run_id, item_id, type, temperatuur, temp_in_range, ingevuld_door, ingevuld_op)
    VALUES (v_checklist_run_id, 'temp_vries', 'temperatuur', _temp_vries,
            _temp_vries <= -18, _user_id, now());
  ELSIF _temp_skip ? 'vries' THEN
    INSERT INTO checklist_responses (run_id, item_id, type, notitie, ingevuld_door, ingevuld_op)
    VALUES (v_checklist_run_id, 'temp_vries', 'temperatuur',
            format('OVERGESLAGEN: %s', _temp_skip->>'vries'), _user_id, now());
  END IF;

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