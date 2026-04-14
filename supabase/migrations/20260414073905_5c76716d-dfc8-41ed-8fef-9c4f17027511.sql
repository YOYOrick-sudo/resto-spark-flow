
-- =============================================
-- Taken & HACCP Module
-- =============================================

-- 1. checklist_templates
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  naam VARCHAR(255) NOT NULL,
  type VARCHAR(30) NOT NULL,
  categorie VARCHAR(50),
  beschrijving TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  actief BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.validate_checklist_template_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type NOT IN ('opening','sluiting','tussentijds','schoonmaak','haccp') THEN
    RAISE EXCEPTION 'Invalid checklist type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_checklist_template_type
  BEFORE INSERT OR UPDATE ON public.checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.validate_checklist_template_type();

-- 2. checklist_runs
CREATE TABLE public.checklist_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id),
  datum DATE NOT NULL DEFAULT CURRENT_DATE,
  shift VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  gestart_door UUID REFERENCES public.profiles(id),
  afgerond_door UUID REFERENCES public.profiles(id),
  gestart_op TIMESTAMPTZ,
  afgerond_op TIMESTAMPTZ,
  opmerkingen TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, datum, shift)
);

CREATE OR REPLACE FUNCTION public.validate_checklist_run()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.shift IS NOT NULL AND NEW.shift NOT IN ('ochtend','middag','avond') THEN
    RAISE EXCEPTION 'Invalid shift: %', NEW.shift;
  END IF;
  IF NEW.status NOT IN ('open','bezig','afgerond') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_checklist_run
  BEFORE INSERT OR UPDATE ON public.checklist_runs
  FOR EACH ROW EXECUTE FUNCTION public.validate_checklist_run();

-- 3. checklist_responses
CREATE TABLE public.checklist_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.checklist_runs(id) ON DELETE CASCADE,
  item_id VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  checked BOOLEAN,
  temperatuur DECIMAL(5,1),
  notitie TEXT,
  foto_url TEXT,
  temp_in_range BOOLEAN,
  ingevuld_door UUID REFERENCES public.profiles(id),
  ingevuld_op TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.validate_checklist_response_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type NOT IN ('check','temperatuur','notitie','foto') THEN
    RAISE EXCEPTION 'Invalid response type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_checklist_response_type
  BEFORE INSERT OR UPDATE ON public.checklist_responses
  FOR EACH ROW EXECUTE FUNCTION public.validate_checklist_response_type();

-- 4. temperatuur_registraties
CREATE TABLE public.temperatuur_registraties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  locatie_naam VARCHAR(255) NOT NULL,
  type VARCHAR(30) NOT NULL,
  temperatuur DECIMAL(5,1) NOT NULL,
  in_range BOOLEAN NOT NULL DEFAULT true,
  min_temp DECIMAL(5,1),
  max_temp DECIMAL(5,1),
  actie_vereist BOOLEAN NOT NULL DEFAULT false,
  actie_beschrijving TEXT,
  gemeten_door UUID REFERENCES public.profiles(id),
  gemeten_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.validate_temp_registratie_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type NOT IN ('koeling','vriezer','warmhouden','kern','overig') THEN
    RAISE EXCEPTION 'Invalid temp type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_temp_registratie_type
  BEFORE INSERT OR UPDATE ON public.temperatuur_registraties
  FOR EACH ROW EXECUTE FUNCTION public.validate_temp_registratie_type();

-- Temperatuur auto-range trigger
CREATE OR REPLACE FUNCTION public.validate_temperatuur()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'koeling' THEN
    NEW.min_temp = COALESCE(NEW.min_temp, 0);
    NEW.max_temp = COALESCE(NEW.max_temp, 7);
    NEW.in_range = NEW.temperatuur >= NEW.min_temp AND NEW.temperatuur <= NEW.max_temp;
  ELSIF NEW.type = 'vriezer' THEN
    NEW.min_temp = COALESCE(NEW.min_temp, -25);
    NEW.max_temp = COALESCE(NEW.max_temp, -18);
    NEW.in_range = NEW.temperatuur <= NEW.max_temp;
  ELSIF NEW.type = 'warmhouden' THEN
    NEW.min_temp = COALESCE(NEW.min_temp, 60);
    NEW.max_temp = COALESCE(NEW.max_temp, 100);
    NEW.in_range = NEW.temperatuur >= NEW.min_temp;
  ELSIF NEW.type = 'kern' THEN
    NEW.min_temp = COALESCE(NEW.min_temp, 75);
    NEW.max_temp = COALESCE(NEW.max_temp, 100);
    NEW.in_range = NEW.temperatuur >= NEW.min_temp;
  END IF;
  NEW.actie_vereist = NOT NEW.in_range;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_temperatuur
  BEFORE INSERT OR UPDATE ON public.temperatuur_registraties
  FOR EACH ROW EXECUTE FUNCTION public.validate_temperatuur();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_checklist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_checklist_templates_updated_at
  BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_checklist_updated_at();

CREATE TRIGGER trg_checklist_runs_updated_at
  BEFORE UPDATE ON public.checklist_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_checklist_updated_at();

-- Indexes
CREATE INDEX idx_checklist_templates_location_type ON public.checklist_templates(location_id, type);
CREATE INDEX idx_checklist_runs_location_datum ON public.checklist_runs(location_id, datum);
CREATE INDEX idx_checklist_runs_template_datum ON public.checklist_runs(template_id, datum);
CREATE INDEX idx_checklist_responses_run ON public.checklist_responses(run_id);
CREATE INDEX idx_temperatuur_registraties_location_gemeten ON public.temperatuur_registraties(location_id, gemeten_op);

-- RLS
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temperatuur_registraties ENABLE ROW LEVEL SECURITY;

-- checklist_templates RLS
CREATE POLICY "checklist_templates_select" ON public.checklist_templates
  FOR SELECT TO authenticated
  USING (public.user_has_location_access((SELECT auth.uid()), location_id));

CREATE POLICY "checklist_templates_insert" ON public.checklist_templates
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY "checklist_templates_update" ON public.checklist_templates
  FOR UPDATE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY "checklist_templates_delete" ON public.checklist_templates
  FOR DELETE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

-- checklist_runs RLS
CREATE POLICY "checklist_runs_select" ON public.checklist_runs
  FOR SELECT TO authenticated
  USING (public.user_has_location_access((SELECT auth.uid()), location_id));

CREATE POLICY "checklist_runs_insert" ON public.checklist_runs
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner'::location_role, 'manager'::location_role, 'kitchen'::location_role]));

CREATE POLICY "checklist_runs_update" ON public.checklist_runs
  FOR UPDATE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner'::location_role, 'manager'::location_role, 'kitchen'::location_role]));

CREATE POLICY "checklist_runs_delete" ON public.checklist_runs
  FOR DELETE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

-- checklist_responses RLS
CREATE POLICY "checklist_responses_select" ON public.checklist_responses
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.checklist_runs r
    WHERE r.id = run_id
    AND public.user_has_location_access((SELECT auth.uid()), r.location_id)
  ));

CREATE POLICY "checklist_responses_insert" ON public.checklist_responses
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.checklist_runs r
    WHERE r.id = run_id
    AND public.user_has_role_in_location((SELECT auth.uid()), r.location_id, ARRAY['owner'::location_role, 'manager'::location_role, 'kitchen'::location_role])
  ));

CREATE POLICY "checklist_responses_update" ON public.checklist_responses
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.checklist_runs r
    WHERE r.id = run_id
    AND public.user_has_role_in_location((SELECT auth.uid()), r.location_id, ARRAY['owner'::location_role, 'manager'::location_role, 'kitchen'::location_role])
  ));

CREATE POLICY "checklist_responses_delete" ON public.checklist_responses
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.checklist_runs r
    WHERE r.id = run_id
    AND public.user_has_role_in_location((SELECT auth.uid()), r.location_id, ARRAY['owner'::location_role, 'manager'::location_role])
  ));

-- temperatuur_registraties RLS
CREATE POLICY "temp_reg_select" ON public.temperatuur_registraties
  FOR SELECT TO authenticated
  USING (public.user_has_location_access((SELECT auth.uid()), location_id));

CREATE POLICY "temp_reg_insert" ON public.temperatuur_registraties
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner'::location_role, 'manager'::location_role, 'kitchen'::location_role]));

CREATE POLICY "temp_reg_update" ON public.temperatuur_registraties
  FOR UPDATE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY "temp_reg_delete" ON public.temperatuur_registraties
  FOR DELETE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
