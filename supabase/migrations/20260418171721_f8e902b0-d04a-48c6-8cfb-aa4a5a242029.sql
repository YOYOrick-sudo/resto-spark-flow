CREATE OR REPLACE FUNCTION public.sync_run_with_template(
  tpl_id uuid,
  today date DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tpl RECORD;
  run_rec RECORD;
  itm jsonb;
  due_items jsonb := '[]'::jsonb;
  new_snapshot jsonb := '[]'::jsonb;
  old_snapshot jsonb;
  old_entry jsonb;
  template_due boolean;
  has_own_freq boolean;
  effective_freq text;
  effective_config jsonb;
  template_item_ids text[] := ARRAY[]::text[];
  due_item_ids text[] := ARRAY[]::text[];
  resp_record RECORD;
  has_resp boolean;
  removed_data jsonb;
  found_item jsonb;
  overdue_van_value text;
BEGIN
  -- 1. Laad template; skip als gearchiveerd of inactief
  SELECT * INTO tpl FROM checklist_templates WHERE id = tpl_id;
  IF NOT FOUND OR tpl.gearchiveerd_op IS NOT NULL OR tpl.actief = false THEN
    RETURN;
  END IF;

  -- 2. Run van vandaag (geen run → niets te syncen)
  SELECT * INTO run_rec
    FROM checklist_runs
    WHERE template_id = tpl_id
      AND datum = today
      AND shift IS NULL
    LIMIT 1;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  old_snapshot := COALESCE(run_rec.items_snapshot, '[]'::jsonb);

  -- 3. Bouw template_item_ids + due_items met dezelfde regels als generate_daily_checklist_runs
  IF tpl.modus = 'gebundeld' THEN
    template_due := is_frequentie_due(tpl.frequentie, tpl.frequentie_config, today);

    FOR itm IN SELECT * FROM jsonb_array_elements(tpl.items)
    LOOP
      template_item_ids := template_item_ids || (itm->>'id');
      has_own_freq := (itm ? 'item_frequentie') AND (itm->>'item_frequentie' IS NOT NULL);

      IF has_own_freq THEN
        effective_freq := itm->>'item_frequentie';
        effective_config := COALESCE(itm->'item_frequentie_config', '{}'::jsonb);
        IF is_frequentie_due(effective_freq, effective_config, today) THEN
          due_item_ids := due_item_ids || (itm->>'id');
        END IF;
      ELSE
        IF template_due THEN
          due_item_ids := due_item_ids || (itm->>'id');
        END IF;
      END IF;
    END LOOP;

  ELSIF tpl.modus = 'per_item' THEN
    FOR itm IN SELECT * FROM jsonb_array_elements(tpl.items)
    LOOP
      template_item_ids := template_item_ids || (itm->>'id');
      IF itm->>'item_frequentie' IS NULL THEN
        CONTINUE;
      END IF;
      effective_freq := itm->>'item_frequentie';
      effective_config := COALESCE(itm->'item_frequentie_config', '{}'::jsonb);
      IF is_frequentie_due(effective_freq, effective_config, today) THEN
        due_item_ids := due_item_ids || (itm->>'id');
      END IF;
    END LOOP;
  ELSE
    RETURN;
  END IF;

  -- 4a. Stap 5a: due items die nog in template bestaan
  --     Stap 5b: behoud overdue_van uit oude snapshot voor item_ids die nog in template staan
  IF due_item_ids IS NOT NULL THEN
    FOR i IN 1..array_length(due_item_ids, 1) LOOP
      overdue_van_value := NULL;
      -- zoek in oude snapshot of er een overdue_van bekend was
      FOR old_entry IN SELECT * FROM jsonb_array_elements(old_snapshot)
      LOOP
        IF (old_entry->>'item_id') = due_item_ids[i] AND (old_entry ? 'overdue_van') THEN
          overdue_van_value := old_entry->>'overdue_van';
          EXIT;
        END IF;
      END LOOP;

      IF overdue_van_value IS NOT NULL THEN
        new_snapshot := new_snapshot || jsonb_build_array(jsonb_build_object(
          'item_id', due_item_ids[i],
          'overdue_van', overdue_van_value
        ));
      ELSE
        new_snapshot := new_snapshot || jsonb_build_array(jsonb_build_object(
          'item_id', due_item_ids[i]
        ));
      END IF;
    END LOOP;
  END IF;

  -- 4c. Stap 5c: oude snapshot-items die NIET in due_item_ids zitten
  FOR old_entry IN SELECT * FROM jsonb_array_elements(old_snapshot)
  LOOP
    -- al opgenomen via due-pad? skip
    IF due_item_ids IS NOT NULL AND (old_entry->>'item_id') = ANY(due_item_ids) THEN
      CONTINUE;
    END IF;

    -- check response (HACCP-bewijs)
    SELECT * INTO resp_record
      FROM checklist_responses
      WHERE run_id = run_rec.id
        AND item_id = (old_entry->>'item_id')
      LIMIT 1;

    has_resp := FOUND AND (
      resp_record.checked = true
      OR resp_record.temperatuur IS NOT NULL
      OR (resp_record.notitie IS NOT NULL AND length(resp_record.notitie) > 0)
    );

    IF NOT has_resp THEN
      -- geen bewijs → laten vallen (regel 2/3)
      CONTINUE;
    END IF;

    -- has_resp = true
    IF (old_entry->>'item_id') = ANY(template_item_ids) THEN
      -- nog in template, alleen niet meer due → behouden zonder removed_item flag
      new_snapshot := new_snapshot || jsonb_build_array(jsonb_build_object(
        'item_id', old_entry->>'item_id'
      ));
    ELSE
      -- niet meer in template + heeft response → behouden mét removed_item-data
      -- bron i: oude snapshot.removed_item
      removed_data := old_entry->'removed_item';

      -- bron ii: laatst bekende item-data uit een snapshot van eerdere run (zelfde tpl, 30d)
      IF removed_data IS NULL THEN
        SELECT (snap_entry)
          INTO found_item
          FROM (
            SELECT jsonb_array_elements(items_snapshot) AS snap_entry
              FROM checklist_runs
              WHERE template_id = tpl_id
                AND location_id = tpl.location_id
                AND datum >= today - INTERVAL '30 days'
                AND datum < today
                AND items_snapshot IS NOT NULL
              ORDER BY datum DESC
          ) sub
          WHERE (snap_entry->>'item_id') = (old_entry->>'item_id')
            AND (snap_entry ? 'removed_item')
          LIMIT 1;

        IF FOUND AND found_item IS NOT NULL THEN
          removed_data := found_item->'removed_item';
        END IF;
      END IF;

      -- bron iii: fallback uit response-type
      IF removed_data IS NULL THEN
        removed_data := jsonb_build_object(
          'titel', 'Verwijderde taak',
          'type', COALESCE(resp_record.type, 'check')
        );
      END IF;

      new_snapshot := new_snapshot || jsonb_build_array(jsonb_build_object(
        'item_id', old_entry->>'item_id',
        'removed_item', removed_data
      ));
    END IF;
  END LOOP;

  -- 5. Update alleen als snapshot daadwerkelijk verandert
  IF new_snapshot IS DISTINCT FROM old_snapshot THEN
    UPDATE checklist_runs
       SET items_snapshot = new_snapshot,
           updated_at = now()
     WHERE id = run_rec.id;
  END IF;
END;
$function$;

-- Sta authenticated users toe om deze RPC aan te roepen
GRANT EXECUTE ON FUNCTION public.sync_run_with_template(uuid, date) TO authenticated;