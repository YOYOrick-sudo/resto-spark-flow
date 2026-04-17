-- Sprint C2b — Schema-uitbreiding voor frequentie-per-item + overdue rollover

-- 1. Modus-kolom op checklist_templates
-- gebundeld = alle items samen, template-frequentie geldt
-- per_item = items hebben eigen frequentie, alleen due items in run
ALTER TABLE public.checklist_templates
  ADD COLUMN IF NOT EXISTS modus text NOT NULL DEFAULT 'gebundeld'
  CHECK (modus IN ('gebundeld', 'per_item'));

-- 2. items_snapshot op checklist_runs voor per-item modus + overdue rollover
-- NULL = legacy/gebundeld (alle items uit template)
-- Anders: array van { item_id: string, overdue_van?: 'YYYY-MM-DD' }
ALTER TABLE public.checklist_runs
  ADD COLUMN IF NOT EXISTS items_snapshot jsonb;

-- 3. Helper-functie: bepaalt of een frequentie+config "due" is op een gegeven datum
CREATE OR REPLACE FUNCTION public.is_frequentie_due(
  freq text,
  config jsonb,
  check_date date
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  weekdag int;
  weekdagen_arr int[];
  interval_w int;
  start_dt date;
  weken_diff int;
  dag_van_maand int;
  maand_van_jaar int;
  interval_dagen int;
  start_check date;
BEGIN
  IF freq IS NULL THEN
    RETURN false;
  END IF;

  CASE freq
    WHEN 'dagelijks' THEN
      RETURN true;

    WHEN 'wekelijks' THEN
      -- ISODOW: 1=ma, 7=zo
      weekdag := EXTRACT(ISODOW FROM check_date)::int;
      SELECT array_agg((value::text)::int) INTO weekdagen_arr
        FROM jsonb_array_elements_text(COALESCE(config->'weekdagen', '[]'::jsonb));
      IF weekdagen_arr IS NULL OR NOT (weekdag = ANY(weekdagen_arr)) THEN
        RETURN false;
      END IF;
      interval_w := COALESCE((config->>'interval_weken')::int, 1);
      IF interval_w <= 1 THEN
        RETURN true;
      END IF;
      -- Bi-weekly+: check (datum - start) / 7 % interval = 0
      start_dt := COALESCE((config->>'start_datum')::date, check_date);
      IF check_date < start_dt THEN
        RETURN false;
      END IF;
      weken_diff := ((check_date - start_dt) / 7);
      RETURN (weken_diff % interval_w) = 0;

    WHEN 'maandelijks' THEN
      dag_van_maand := COALESCE((config->>'dag_van_maand')::int, 1);
      RETURN EXTRACT(DAY FROM check_date)::int = dag_van_maand;

    WHEN 'kwartaal' THEN
      -- Eerste dag van elk kwartaal (jan, apr, jul, okt) op dag_van_maand
      dag_van_maand := COALESCE((config->>'dag_van_maand')::int, 1);
      maand_van_jaar := EXTRACT(MONTH FROM check_date)::int;
      RETURN (maand_van_jaar IN (1, 4, 7, 10))
        AND EXTRACT(DAY FROM check_date)::int = dag_van_maand;

    WHEN 'halfjaar' THEN
      dag_van_maand := COALESCE((config->>'dag_van_maand')::int, 1);
      maand_van_jaar := EXTRACT(MONTH FROM check_date)::int;
      RETURN (maand_van_jaar IN (1, 7))
        AND EXTRACT(DAY FROM check_date)::int = dag_van_maand;

    WHEN 'jaarlijks' THEN
      dag_van_maand := COALESCE((config->>'dag_van_maand')::int, 1);
      maand_van_jaar := COALESCE((config->>'maand_van_jaar')::int, 1);
      RETURN EXTRACT(MONTH FROM check_date)::int = maand_van_jaar
        AND EXTRACT(DAY FROM check_date)::int = dag_van_maand;

    WHEN 'custom' THEN
      interval_dagen := COALESCE((config->>'interval_dagen')::int, 1);
      start_check := COALESCE((config->>'start_datum')::date, check_date);
      IF check_date < start_check THEN
        RETURN false;
      END IF;
      RETURN ((check_date - start_check) % interval_dagen) = 0;

    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- 4. Helper-functie: verzamelt overdue items van laatste 14 dagen (de-dup naar oudste)
-- Geeft jsonb array terug van { item_id, overdue_van }
CREATE OR REPLACE FUNCTION public.get_overdue_items(
  tpl_id uuid,
  today date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  rec RECORD;
  item_id_val text;
  oldest_date date;
BEGIN
  -- Loop: per item_id de oudste run-datum waar het in snapshot zat
  -- maar nooit afgevinkt is in eender welke latere response
  FOR rec IN
    WITH snapshot_items AS (
      -- Alle (run_id, datum, item_id) combinaties uit snapshots laatste 14 dagen
      SELECT
        r.id AS run_id,
        r.datum,
        (snap_item->>'item_id') AS item_id
      FROM checklist_runs r
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.items_snapshot, '[]'::jsonb)) AS snap_item
      WHERE r.template_id = tpl_id
        AND r.datum >= today - 14
        AND r.datum < today
        AND r.items_snapshot IS NOT NULL
    ),
    -- Items die ergens (in welke run dan ook van deze template) afgevinkt zijn
    checked_items AS (
      SELECT DISTINCT cr.item_id
      FROM checklist_responses cr
      JOIN checklist_runs run ON run.id = cr.run_id
      WHERE run.template_id = tpl_id
        AND cr.checked = true
        AND run.datum >= today - 14
    ),
    -- Filter: items die in snapshot zaten maar nergens afgevinkt zijn
    overdue AS (
      SELECT
        si.item_id,
        MIN(si.datum) AS oldest_datum
      FROM snapshot_items si
      WHERE si.item_id NOT IN (SELECT item_id FROM checked_items)
      GROUP BY si.item_id
    )
    SELECT item_id, oldest_datum FROM overdue
  LOOP
    result := result || jsonb_build_object(
      'item_id', rec.item_id,
      'overdue_van', to_char(rec.oldest_datum, 'YYYY-MM-DD')
    );
  END LOOP;

  RETURN result;
END;
$$;

-- 5. Rewrite generate_daily_checklist_runs() voor modus + bi-weekly + overdue rollover
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
    SELECT * FROM checklist_templates WHERE actief = true
  LOOP

    IF tpl.modus = 'gebundeld' THEN
      -- Legacy: check template-frequentie, alle items, snapshot=NULL
      IF is_frequentie_due(tpl.frequentie, tpl.frequentie_config, today) THEN
        INSERT INTO checklist_runs (location_id, template_id, datum, status, items_snapshot)
        SELECT tpl.location_id, tpl.id, today, 'open', NULL
        WHERE NOT EXISTS (
          SELECT 1 FROM checklist_runs
          WHERE template_id = tpl.id AND datum = today AND shift IS NULL
        );
      END IF;

    ELSIF tpl.modus = 'per_item' THEN
      -- Per item: alleen due items + overdue rollover
      due_items := '[]'::jsonb;
      FOR itm IN SELECT * FROM jsonb_array_elements(tpl.items)
      LOOP
        effective_freq := COALESCE(itm->>'frequentie', tpl.frequentie);
        effective_config := COALESCE(itm->'frequentie_config', tpl.frequentie_config);
        IF is_frequentie_due(effective_freq, effective_config, today) THEN
          due_items := due_items || jsonb_build_array(jsonb_build_object('item_id', itm->>'id'));
        END IF;
      END LOOP;

      overdue_items := get_overdue_items(tpl.id, today);

      -- Dedupe: als overdue al in due zit, gebruik due (geen overdue marker)
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