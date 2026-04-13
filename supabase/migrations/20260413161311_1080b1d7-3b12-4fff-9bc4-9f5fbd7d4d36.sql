
-- =====================================================
-- MEP TAKEN SYSTEEM — MIGRATIE
-- =====================================================

-- 1. TABELLEN
-- -----------------------------------------------------

CREATE TABLE public.mep_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  task_date DATE NOT NULL,
  deadline TIME,
  recept_id UUID REFERENCES public.recepten(id),
  methode_id UUID REFERENCES public.halffabricaat_methodes(id),
  target_units NUMERIC(10,2),
  target_eenheid VARCHAR(50),
  priority INTEGER NOT NULL DEFAULT 2,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mep_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.mep_tasks(id) ON DELETE CASCADE,
  completed_by UUID NOT NULL REFERENCES auth.users(id),
  units_gemaakt NUMERIC(10,2) NOT NULL DEFAULT 1,
  yield_percentage NUMERIC(5,2),
  temperatuur NUMERIC(5,1),
  batch_id UUID,
  notitie TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.productie_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  batch_nummer VARCHAR(20) NOT NULL,
  recept_id UUID NOT NULL REFERENCES public.recepten(id),
  methode_id UUID REFERENCES public.halffabricaat_methodes(id),
  hoeveelheid NUMERIC(10,2) NOT NULL,
  eenheid VARCHAR(50) NOT NULL,
  productie_datum DATE NOT NULL DEFAULT CURRENT_DATE,
  houdbaar_tot DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'produced',
  geproduceerd_door UUID REFERENCES auth.users(id),
  notitie TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK van completions naar batches (after productie_batches exists)
ALTER TABLE public.mep_task_completions
  ADD CONSTRAINT mep_task_completions_batch_id_fkey
  FOREIGN KEY (batch_id) REFERENCES public.productie_batches(id);

-- 2. INDEXES
-- -----------------------------------------------------

CREATE INDEX idx_mep_tasks_location_date ON public.mep_tasks(location_id, task_date);
CREATE INDEX idx_mep_tasks_location_status ON public.mep_tasks(location_id, status);
CREATE INDEX idx_mep_task_completions_task ON public.mep_task_completions(task_id);
CREATE INDEX idx_productie_batches_location_datum ON public.productie_batches(location_id, productie_datum);

-- 3. FUNCTIES & TRIGGERS
-- -----------------------------------------------------

-- 3a. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_mep_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_mep_tasks_updated_at
  BEFORE UPDATE ON public.mep_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_mep_tasks_updated_at();

-- 3b. Validatie trigger
CREATE OR REPLACE FUNCTION public.validate_mep_tasks()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'in_progress', 'completed', 'skipped') THEN
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
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_mep_tasks
  BEFORE INSERT OR UPDATE ON public.mep_tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_mep_tasks();

-- 3c. Batch nummer generator
CREATE OR REPLACE FUNCTION public.generate_batch_nummer(p_location_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
  v_date_part VARCHAR(8);
  v_seq INTEGER;
BEGIN
  v_date_part := to_char(CURRENT_DATE, 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(split_part(batch_nummer, '-', 2) AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM public.productie_batches
  WHERE location_id = p_location_id
    AND productie_datum = CURRENT_DATE;
  RETURN v_date_part || '-' || lpad(v_seq::text, 3, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 3d. Auto-deplete ingrediënten bij completion
CREATE OR REPLACE FUNCTION public.auto_deplete_ingredients()
RETURNS TRIGGER AS $$
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
    SELECT ri.ingredient_id, ri.hoeveelheid, ri.eenheid
    FROM public.recept_ingredienten ri
    WHERE ri.recept_id = v_recept_id
  LOOP
    INSERT INTO public.voorraad_bewegingen (
      ingredient_id, type, hoeveelheid, eenheid, reden, referentie_id, uitgevoerd_door
    ) VALUES (
      r.ingredient_id,
      'OUT',
      -(r.hoeveelheid * NEW.units_gemaakt / v_porties),
      r.eenheid,
      'MEP auto-deplete',
      NEW.task_id::text,
      NEW.completed_by
    );

    UPDATE public.ingredienten
    SET voorraad = voorraad + (-(r.hoeveelheid * NEW.units_gemaakt / v_porties))
    WHERE id = r.ingredient_id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_auto_deplete
  AFTER INSERT ON public.mep_task_completions
  FOR EACH ROW EXECUTE FUNCTION public.auto_deplete_ingredients();

-- 4. RLS
-- -----------------------------------------------------

ALTER TABLE public.mep_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mep_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productie_batches ENABLE ROW LEVEL SECURITY;

-- mep_tasks
CREATE POLICY "mep_tasks_select" ON public.mep_tasks
  FOR SELECT TO authenticated
  USING (public.user_has_location_access((SELECT auth.uid()), location_id));

CREATE POLICY "mep_tasks_insert" ON public.mep_tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_role_in_location(
    (SELECT auth.uid()), location_id, ARRAY['owner','manager','kitchen']::public.location_role[]
  ));

CREATE POLICY "mep_tasks_update" ON public.mep_tasks
  FOR UPDATE TO authenticated
  USING (public.user_has_role_in_location(
    (SELECT auth.uid()), location_id, ARRAY['owner','manager','kitchen']::public.location_role[]
  ));

CREATE POLICY "mep_tasks_delete" ON public.mep_tasks
  FOR DELETE TO authenticated
  USING (public.user_has_role_in_location(
    (SELECT auth.uid()), location_id, ARRAY['owner','manager','kitchen']::public.location_role[]
  ));

-- mep_task_completions
CREATE POLICY "mep_task_completions_select" ON public.mep_task_completions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mep_tasks mt
    WHERE mt.id = task_id AND public.user_has_location_access((SELECT auth.uid()), mt.location_id)
  ));

CREATE POLICY "mep_task_completions_insert" ON public.mep_task_completions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.mep_tasks mt
    WHERE mt.id = task_id AND public.user_has_role_in_location(
      (SELECT auth.uid()), mt.location_id, ARRAY['owner','manager','kitchen']::public.location_role[]
    )
  ));

CREATE POLICY "mep_task_completions_update" ON public.mep_task_completions
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mep_tasks mt
    WHERE mt.id = task_id AND public.user_has_role_in_location(
      (SELECT auth.uid()), mt.location_id, ARRAY['owner','manager']::public.location_role[]
    )
  ));

CREATE POLICY "mep_task_completions_delete" ON public.mep_task_completions
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mep_tasks mt
    WHERE mt.id = task_id AND public.user_has_role_in_location(
      (SELECT auth.uid()), mt.location_id, ARRAY['owner','manager']::public.location_role[]
    )
  ));

-- productie_batches
CREATE POLICY "productie_batches_select" ON public.productie_batches
  FOR SELECT TO authenticated
  USING (public.user_has_location_access((SELECT auth.uid()), location_id));

CREATE POLICY "productie_batches_insert" ON public.productie_batches
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_role_in_location(
    (SELECT auth.uid()), location_id, ARRAY['owner','manager','kitchen']::public.location_role[]
  ));

CREATE POLICY "productie_batches_update" ON public.productie_batches
  FOR UPDATE TO authenticated
  USING (public.user_has_role_in_location(
    (SELECT auth.uid()), location_id, ARRAY['owner','manager']::public.location_role[]
  ));

CREATE POLICY "productie_batches_delete" ON public.productie_batches
  FOR DELETE TO authenticated
  USING (public.user_has_role_in_location(
    (SELECT auth.uid()), location_id, ARRAY['owner','manager']::public.location_role[]
  ));

-- voorraad_bewegingen fix: kitchen rol toevoegen
DROP POLICY IF EXISTS "voorraad_bewegingen_insert" ON public.voorraad_bewegingen;

CREATE POLICY "voorraad_bewegingen_insert" ON public.voorraad_bewegingen
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = ingredient_id
    AND public.user_has_role_in_location(
      (SELECT auth.uid()), i.location_id, ARRAY['owner','manager','kitchen']::public.location_role[]
    )
  ));
