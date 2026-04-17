-- 1. Kolom toevoegen voor soft-delete
ALTER TABLE public.checklist_templates
  ADD COLUMN IF NOT EXISTS gearchiveerd_op timestamptz NULL;

-- 2. Run-generator: skip gearchiveerde templates
CREATE OR REPLACE FUNCTION public.generate_daily_checklist_runs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  FOR tpl IN
    SELECT * FROM checklist_templates
    WHERE actief = true
      AND gearchiveerd_op IS NULL
  LOOP

    IF tpl.modus = 'gebundeld' THEN
      IF is_frequentie_due(tpl.frequentie, tpl.frequentie_config, today) THEN
        INSERT INTO checklist_runs (location_id, template_id, datum, status, items_snapshot)
        SELECT tpl.location_id, tpl.id, today, 'open', NULL
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

      IF overdue_item_ids IS NOT NULL THEN
        SELECT COALESCE(jsonb_agg(ov), '[]'::jsonb)
          INTO overdue_items
          FROM jsonb_array_elements(overdue_items) AS ov
          WHERE NOT ((ov->>'item_id') = ANY(overdue_item_ids));
      END IF;

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
$$;