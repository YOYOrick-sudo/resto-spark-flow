
-- ============================================================
-- STAP 1: Template-items opschonen (verpakking_intact + tht_gecontroleerd weg)
-- ============================================================
UPDATE checklist_templates
SET items = COALESCE(
  (SELECT jsonb_agg(elem)
   FROM jsonb_array_elements(items) elem
   WHERE elem->>'id' NOT IN ('verpakking_intact','tht_gecontroleerd')),
  '[]'::jsonb)
WHERE naam ILIKE 'ontvangst%';

-- ============================================================
-- STAP 2: Dedup-met-merge (materialiseer set in temp tabel)
-- ============================================================
CREATE TEMP TABLE _ontvangst_dedup ON COMMIT DROP AS
SELECT
  cr.id,
  cr.template_id,
  cr.location_id,
  cr.datum,
  ROW_NUMBER() OVER (PARTITION BY cr.template_id, cr.location_id, cr.datum ORDER BY cr.created_at ASC, cr.id ASC) AS rn,
  FIRST_VALUE(cr.id) OVER (PARTITION BY cr.template_id, cr.location_id, cr.datum ORDER BY cr.created_at ASC, cr.id ASC) AS keep_id
FROM checklist_runs cr
WHERE EXISTS (
  SELECT 1 FROM checklist_templates ct
  WHERE ct.id = cr.template_id AND ct.naam ILIKE 'ontvangst%'
);

-- Verplaats responses van duplicaten naar de oudste run.
-- ON CONFLICT: als de keep-run al een response op hetzelfde item heeft, gooi de duplicaat weg.
UPDATE checklist_responses r
SET run_id = d.keep_id
FROM _ontvangst_dedup d
WHERE r.run_id = d.id
  AND d.rn > 1
  AND NOT EXISTS (
    SELECT 1 FROM checklist_responses r2
    WHERE r2.run_id = d.keep_id AND r2.item_id = r.item_id
  );

-- Resterende responses op de te-verwijderen runs (waar de keep-run al een response had) → weg.
DELETE FROM checklist_responses
WHERE run_id IN (SELECT id FROM _ontvangst_dedup WHERE rn > 1);

-- Duplicaat-runs verwijderen.
DELETE FROM checklist_runs
WHERE id IN (SELECT id FROM _ontvangst_dedup WHERE rn > 1);

-- ============================================================
-- STAP 3: Unique index (idempotent — duplicaten zijn nu weg)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS uniq_checklist_runs_template_location_datum
  ON checklist_runs (template_id, location_id, datum);

-- ============================================================
-- STAP 4: RPC confirm_goods_receipt — drie compliance-fixes
--   a) Hardcoded template-UUID → per-location lookup
--   b) Valse verpakking_intact/tht_gecontroleerd responses verwijderd
--   c) Run reuse-of-create + gracieuze skip zonder template
-- Boeking-logica (tak A/B/C/D) ongewijzigd.
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_goods_receipt(
  _receipt_id uuid,
  _user_id uuid,
  _lines jsonb,
  _temp_gekoeld numeric DEFAULT NULL::numeric,
  _temp_vries numeric DEFAULT NULL::numeric,
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
  v_template_id uuid;
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

  -- FIX 2: per-location template lookup (was hardcoded UUID)
  SELECT id INTO v_template_id
  FROM checklist_templates
  WHERE location_id = v_receipt.location_id
    AND naam ILIKE 'ontvangst%'
    AND gearchiveerd_op IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

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
      SELECT * INTO v_ingredient FROM ingredienten WHERE id = v_line_db.ingredient_id FOR UPDATE;

      v_dedup_key := format('gr_%s_line_%s', _receipt_id, v_line_db.id);

      INSERT INTO voorraad_bewegingen (
        ingredient_id, location_id, type, hoeveelheid, eenheid,
        bron_type, bron_id, notitie, uitgevoerd_door, dedup_key
      ) VALUES (
        v_line_db.ingredient_id, v_receipt.location_id, 'inkoop',
        v_delta_base, v_base_unit, 'goods_receipt', _receipt_id,
        format('Pakbon-ontvangst regel %s', v_line_db.id), _user_id, v_dedup_key
      )
      ON CONFLICT (dedup_key) DO NOTHING;

      IF FOUND THEN
        v_voorraad_movements := v_voorraad_movements + 1;
      END IF;

      UPDATE ingredienten
      SET voorraad = COALESCE(voorraad, 0) + v_delta_base,
          updated_at = now()
      WHERE id = v_line_db.ingredient_id;

      IF v_la_id IS NOT NULL AND v_factor_source_to_set IS NOT NULL THEN
        UPDATE leveranciers_artikelen
        SET factor_source = v_factor_source_to_set,
            updated_at = now()
        WHERE id = v_la_id;
      END IF;

      IF v_line_db.tht_datum IS NOT NULL OR v_line_db.lotnummer IS NOT NULL THEN
        v_lot_notes := format('Pakbon %s', _receipt_id);
        INSERT INTO ingredient_lots (
          ingredient_id, location_id, lotnummer, tht_datum,
          hoeveelheid_initieel, hoeveelheid_resterend, eenheid,
          bron_type, bron_id, aangemaakt_door, notitie
        ) VALUES (
          v_line_db.ingredient_id, v_receipt.location_id,
          v_line_db.lotnummer, v_line_db.tht_datum,
          v_delta_base, v_delta_base, v_base_unit,
          'goods_receipt', _receipt_id, _user_id, v_lot_notes
        )
        RETURNING id INTO v_lot_id;
      END IF;
    END IF;

    IF v_status IN ('afwijking_missing','afwijking_beschadigd','afwijking_verkeerd') AND NOT v_accepted_with_issue THEN
      v_credit_type := CASE v_status
        WHEN 'afwijking_missing' THEN 'missing'::credit_note_type
        WHEN 'afwijking_beschadigd' THEN 'damaged'::credit_note_type
        WHEN 'afwijking_verkeerd' THEN 'wrong'::credit_note_type
      END;
      INSERT INTO credit_notes (
        goods_receipt_id, goods_receipt_line_id, location_id,
        leverancier_id, ingredient_id, type, hoeveelheid, eenheid,
        notitie, foto_url, aangemaakt_door
      ) VALUES (
        _receipt_id, v_line_db.id, v_receipt.location_id,
        v_receipt.leverancier_id, v_line_db.ingredient_id, v_credit_type,
        v_qty, v_line_db.eenheid_verwacht,
        v_line_input->>'afwijking_notitie',
        v_line_input->>'afwijking_foto_url',
        _user_id
      );
      v_credit_notes := v_credit_notes + 1;
    END IF;
  END LOOP;

  -- Strict-temp check (ongewijzigd)
  IF _temp_gekoeld IS NOT NULL THEN
    SELECT MIN(i.haccp_strict_temp_max) INTO v_strict_temp_threshold
    FROM goods_receipt_lines grl
    JOIN ingredienten i ON i.id = grl.ingredient_id
    WHERE grl.goods_receipt_id = _receipt_id
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

  -- FIX 3 + FIX 2 (gracieuze skip): alleen run aanmaken/aanvullen als template bestaat.
  IF v_template_id IS NOT NULL THEN
    -- Reuse-of-create voor vandaag + location
    SELECT id INTO v_checklist_run_id
    FROM checklist_runs
    WHERE template_id = v_template_id
      AND location_id = v_receipt.location_id
      AND datum = CURRENT_DATE
    LIMIT 1;

    IF v_checklist_run_id IS NULL THEN
      INSERT INTO checklist_runs (
        location_id, template_id, datum, status,
        gestart_door, gestart_op, afgerond_door, afgerond_op,
        items_snapshot, opmerkingen
      ) VALUES (
        v_receipt.location_id, v_template_id, CURRENT_DATE, 'afgerond',
        _user_id, now(), _user_id, now(),
        jsonb_build_array(
          jsonb_build_object('item_id','temp_gekoeld'),
          jsonb_build_object('item_id','temp_vries'),
          jsonb_build_object('item_id','opmerking')
        ),
        format('Auto-aangemaakt via pakbon-bevestiging (receipt %s)', _receipt_id)
      )
      ON CONFLICT (template_id, location_id, datum) DO UPDATE
        SET afgerond_op = now(), afgerond_door = _user_id
      RETURNING id INTO v_checklist_run_id;
    ELSE
      UPDATE checklist_runs
      SET afgerond_op = now(),
          afgerond_door = _user_id,
          opmerkingen = COALESCE(opmerkingen,'') || E'\n' ||
                        format('Aangevuld via pakbon-bevestiging (receipt %s)', _receipt_id)
      WHERE id = v_checklist_run_id;
    END IF;

    -- FIX 1: GEEN hardcoded verpakking_intact/tht_gecontroleerd responses meer.
    -- Alleen écht gemeten temperatuur-responses.
    IF _temp_gekoeld IS NOT NULL THEN
      INSERT INTO checklist_responses (run_id, item_id, type, temperatuur, temp_in_range, ingevuld_door, ingevuld_op)
      VALUES (v_checklist_run_id, 'temp_gekoeld', 'temperatuur', _temp_gekoeld, (_temp_gekoeld <= 7) AND NOT v_strict_temp_alarm, _user_id, now())
      ON CONFLICT DO NOTHING;
    ELSIF _temp_skip ? 'gekoeld' THEN
      INSERT INTO checklist_responses (run_id, item_id, type, notitie, ingevuld_door, ingevuld_op)
      VALUES (v_checklist_run_id, 'temp_gekoeld', 'notitie', format('OVERGESLAGEN: %s', _temp_skip->>'gekoeld'), _user_id, now())
      ON CONFLICT DO NOTHING;
    END IF;

    IF _temp_vries IS NOT NULL THEN
      INSERT INTO checklist_responses (run_id, item_id, type, temperatuur, temp_in_range, ingevuld_door, ingevuld_op)
      VALUES (v_checklist_run_id, 'temp_vries', 'temperatuur', _temp_vries, _temp_vries <= -18, _user_id, now())
      ON CONFLICT DO NOTHING;
    ELSIF _temp_skip ? 'vries' THEN
      INSERT INTO checklist_responses (run_id, item_id, type, notitie, ingevuld_door, ingevuld_op)
      VALUES (v_checklist_run_id, 'temp_vries', 'notitie', format('OVERGESLAGEN: %s', _temp_skip->>'vries'), _user_id, now())
      ON CONFLICT DO NOTHING;
    END IF;
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
