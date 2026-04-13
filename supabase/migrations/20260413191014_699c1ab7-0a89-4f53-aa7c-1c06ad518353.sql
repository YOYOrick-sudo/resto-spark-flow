
-- 1. Fix validate_mep_tasks: 'skipped' → 'cancelled'
CREATE OR REPLACE FUNCTION public.validate_mep_tasks()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'in_progress', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Ongeldige status: %', NEW.status;
  END IF;
  IF NEW.priority NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'Prioriteit moet 1-3 zijn, was: %', NEW.priority;
  END IF;
  IF NEW.recept_id IS NULL AND NEW.methode_id IS NOT NULL THEN
    RAISE EXCEPTION 'methode_id vereist een recept_id';
  END IF;
  IF NEW.target_units IS NOT NULL AND NEW.target_units <= 0 THEN
    RAISE EXCEPTION 'target_units moet > 0 zijn';
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Fix auto_deplete_ingredients: correcte voorraad_bewegingen kolommen
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
      NEW.completed_by
    );

    UPDATE public.ingredienten
    SET voorraad = voorraad + (-(r.hoeveelheid * NEW.units_gemaakt / v_porties))
    WHERE id = r.ingredient_id;
  END LOOP;

  RETURN NEW;
END;
$$;
