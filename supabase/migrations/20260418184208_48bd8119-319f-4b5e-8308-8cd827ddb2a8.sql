CREATE OR REPLACE FUNCTION public.generate_daily_checklist_runs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tpl RECORD;
  itm jsonb;
  today date := CURRENT_DATE;
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
  -- Pre-compute: welke locaties zijn 'today' dicht?
  -- Gesloten = (closed-exception bestaat) OF (geen exception én geen reguliere uren voor deze weekdag)
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
  LOOP

    IF tpl.modus = 'gebundeld' THEN
      template_due := is_frequentie_due(tpl.frequentie, tpl.frequentie_config, today);

      due_items := '[]'::jsonb;
      own_freq_item_ids := ARRAY[]::text[];

      FOR itm IN SELECT * FROM jsonb_array_elements(tpl.items)
      LOOP
        has_own_freq := (itm ? 'item_frequentie')
                        AND (itm->>'item_frequentie' IS NOT NULL);

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

      SELECT array_agg(due_item->>'item_id')
        INTO overdue_item_ids
        FROM jsonb_array_elements(due_items) AS due_item;

      SELECT COALESCE(jsonb_agg(ov), '[]'::jsonb)
        INTO overdue_items
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
      FOR itm IN SELECT * FROM jsonb_array_elements(tpl.items)
      LOOP
        IF itm->>'item_frequentie' IS NULL THEN
          CONTINUE;
        END IF;
        effective_freq := itm->>'item_frequentie';
        effective_config := COALESCE(itm->'item_frequentie_config', '{}'::jsonb);
        IF is_frequentie_due(effective_freq, effective_config, today) THEN
          due_items := due_items || jsonb_build_array(jsonb_build_object('item_id', itm->>'id'));
        END IF;
      END LOOP;

      overdue_items := get_overdue_items(tpl.id, today);

      SELECT array_agg(due_item->>'item_id')
        INTO overdue_item_ids
        FROM jsonb_array_elements(due_items) AS due_item;

      SELECT COALESCE(jsonb_agg(ov), '[]'::jsonb)
        INTO overdue_items
        FROM jsonb_array_elements(overdue_items) AS ov
        WHERE (overdue_item_ids IS NULL OR NOT ((ov->>'item_id') = ANY(overdue_item_ids)));

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

-- Test-variant met expliciete datum-parameter — bedoeld voor verificatie/CI.
-- Identieke logica als de no-arg variant maar accepteert _target_date.
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
      SELECT array_agg(due_item->>'item_id') INTO overdue_item_ids
        FROM jsonb_array_elements(due_items) AS due_item;
      SELECT COALESCE(jsonb_agg(ov), '[]'::jsonb) INTO overdue_items
        FROM jsonb_array_elements(overdue_items) AS ov
        WHERE (overdue_item_ids IS NULL OR NOT ((ov->>'item_id') = ANY(overdue_item_ids)));
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