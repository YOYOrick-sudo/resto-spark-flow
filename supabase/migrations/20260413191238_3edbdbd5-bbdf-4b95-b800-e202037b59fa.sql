
-- 1. mep_tasks: target_units → units
ALTER TABLE public.mep_tasks RENAME COLUMN target_units TO units;

-- 2. mep_tasks: priority (int) → prioriteit (varchar)
ALTER TABLE public.mep_tasks ADD COLUMN prioriteit VARCHAR(50) NOT NULL DEFAULT 'Normaal';
UPDATE public.mep_tasks SET prioriteit = CASE 
  WHEN priority = 3 THEN 'Hoog'
  WHEN priority = 2 THEN 'Normaal'
  ELSE 'Laag'
END;
ALTER TABLE public.mep_tasks DROP COLUMN priority;

-- 3. mep_task_completions: completed_by → medewerker_id
ALTER TABLE public.mep_task_completions RENAME COLUMN completed_by TO medewerker_id;

-- 4. mep_task_completions: batch_id (UUID FK) → batch_nummer (VARCHAR)
ALTER TABLE public.mep_task_completions DROP CONSTRAINT IF EXISTS mep_task_completions_batch_id_fkey;
ALTER TABLE public.mep_task_completions DROP COLUMN batch_id;
ALTER TABLE public.mep_task_completions ADD COLUMN batch_nummer VARCHAR(50);

-- 5. mep_task_completions: add output gram columns
ALTER TABLE public.mep_task_completions ADD COLUMN verwachte_output_gram NUMERIC;
ALTER TABLE public.mep_task_completions ADD COLUMN werkelijke_output_gram NUMERIC;

-- 6. productie_batches: geproduceerd_door → medewerker_id
ALTER TABLE public.productie_batches RENAME COLUMN geproduceerd_door TO medewerker_id;

-- 7. productie_batches: add task_completion_id
ALTER TABLE public.productie_batches ADD COLUMN task_completion_id UUID
  REFERENCES public.mep_task_completions(id);

-- 8. Update validate_mep_tasks trigger function for new column names
CREATE OR REPLACE FUNCTION public.validate_mep_tasks()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'in_progress', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Ongeldige status: %', NEW.status;
  END IF;
  IF NEW.prioriteit NOT IN ('Laag', 'Normaal', 'Hoog') THEN
    RAISE EXCEPTION 'Ongeldige prioriteit: %, moet Laag/Normaal/Hoog zijn', NEW.prioriteit;
  END IF;
  IF NEW.recept_id IS NULL AND NEW.methode_id IS NOT NULL THEN
    RAISE EXCEPTION 'methode_id vereist een recept_id';
  END IF;
  IF NEW.units IS NOT NULL AND NEW.units <= 0 THEN
    RAISE EXCEPTION 'units moet > 0 zijn';
  END IF;
  RETURN NEW;
END;
$$;

-- 9. Update auto_deplete_ingredients trigger function for new column names
CREATE OR REPLACE FUNCTION public.auto_deplete_ingredients()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_recept_id UUID;
  v_porties NUMERIC;
  r RECORD;
BEGIN
  SELECT mt.recept_id INTO v_recept_id
  FROM public.mep_tasks mt
  WHERE mt.id = NEW.task_id;

  IF v_recept_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT re.porties INTO v_porties
  FROM public.recepten re
  WHERE re.id = v_recept_id;

  v_porties := COALESCE(v_porties, 1);

  FOR r IN
    SELECT ri.ingredient_id, ri.hoeveelheid
    FROM public.recept_ingredienten ri
    WHERE ri.recept_id = v_recept_id
  LOOP
    INSERT INTO public.voorraad_bewegingen (
      ingredient_id, type, hoeveelheid, bron, referentie_type, referentie_id, medewerker_id
    ) VALUES (
      r.ingredient_id,
      'OUT',
      -(r.hoeveelheid * NEW.units_gemaakt / v_porties),
      'Productie',
      'mep_task',
      NEW.task_id,
      NEW.medewerker_id
    );

    UPDATE public.ingredienten
    SET voorraad = voorraad + (-(r.hoeveelheid * NEW.units_gemaakt / v_porties))
    WHERE id = r.ingredient_id;
  END LOOP;

  RETURN NEW;
END;
$$;
