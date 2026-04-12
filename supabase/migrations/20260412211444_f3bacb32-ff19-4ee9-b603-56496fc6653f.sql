
-- =============================================
-- 1. TABLES
-- =============================================

-- recepten
CREATE TABLE public.recepten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  naam VARCHAR(255) NOT NULL,
  categorie VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'halffabricaat',
  porties INT NOT NULL DEFAULT 1,
  actieve_bereidingstijd INT,
  passieve_bereidingstijd INT,
  bereiding TEXT,
  totale_ingredientkostprijs DECIMAL(10,2),
  arbeidskostprijs DECIMAL(10,2),
  totale_kostprijs DECIMAL(10,2),
  kostprijs_per_portie DECIMAL(10,2),
  kostprijs_berekend_op TIMESTAMPTZ,
  versie INT DEFAULT 1,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id, naam)
);

-- recept_ingredienten
CREATE TABLE public.recept_ingredienten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recept_id UUID NOT NULL REFERENCES public.recepten(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredienten(id),
  hoeveelheid DECIMAL(10,3) NOT NULL,
  eenheid VARCHAR(20),
  kostprijs_snapshot DECIMAL(10,4),
  yield_snapshot DECIMAL(5,2),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- recept_allergenen
CREATE TABLE public.recept_allergenen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recept_id UUID NOT NULL REFERENCES public.recepten(id) ON DELETE CASCADE,
  allergeen_id UUID NOT NULL REFERENCES public.allergenen(id),
  status VARCHAR(15) NOT NULL DEFAULT 'onbekend',
  berekend_op TIMESTAMPTZ DEFAULT now(),
  UNIQUE(recept_id, allergeen_id)
);

-- halffabricaat_methodes
CREATE TABLE public.halffabricaat_methodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recept_id UUID NOT NULL REFERENCES public.recepten(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  visuele_eenheid VARCHAR(50) NOT NULL,
  output_hoeveelheid DECIMAL(10,2) NOT NULL,
  output_eenheid VARCHAR(20) NOT NULL,
  standaard_duur INT NOT NULL,
  houdbaarheid INT,
  sub_recept_id UUID REFERENCES public.recepten(id),
  instructie TEXT,
  batch_nummer_template VARCHAR(50) DEFAULT 'YYYYMMDD-XXX',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. VALIDATION TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION public.validate_recepten()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type NOT IN ('halffabricaat', 'gerecht') THEN
    RAISE EXCEPTION 'Invalid type: %', NEW.type;
  END IF;
  IF NEW.porties < 1 THEN
    RAISE EXCEPTION 'porties must be > 0';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_recepten
  BEFORE INSERT OR UPDATE ON public.recepten
  FOR EACH ROW EXECUTE FUNCTION public.validate_recepten();

CREATE OR REPLACE FUNCTION public.validate_recept_allergenen_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('bevat', 'kan_bevatten', 'geen', 'onbekend') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_recept_allergenen
  BEFORE INSERT OR UPDATE ON public.recept_allergenen
  FOR EACH ROW EXECUTE FUNCTION public.validate_recept_allergenen_status();

CREATE OR REPLACE FUNCTION public.validate_halffabricaat_methodes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type NOT IN ('Bereiden','Aanvullen','Snijden','Roosteren','Portioneren','Uithalen','Ontdooien','Opwarmen','Afmaken','Overig') THEN
    RAISE EXCEPTION 'Invalid methode type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_halffabricaat_methodes
  BEFORE INSERT OR UPDATE ON public.halffabricaat_methodes
  FOR EACH ROW EXECUTE FUNCTION public.validate_halffabricaat_methodes();

-- =============================================
-- 3. UPDATED_AT TRIGGER
-- =============================================

CREATE TRIGGER update_recepten_updated_at
  BEFORE UPDATE ON public.recepten
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4. ALLERGENEN AUTO-AGGREGATION TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION public.recalculate_recept_allergenen()
RETURNS TRIGGER AS $$
DECLARE
  v_recept_id UUID;
BEGIN
  v_recept_id := COALESCE(NEW.recept_id, OLD.recept_id);

  DELETE FROM public.recept_allergenen WHERE recept_id = v_recept_id;

  INSERT INTO public.recept_allergenen (recept_id, allergeen_id, status)
  SELECT
    v_recept_id,
    ia.allergeen_id,
    CASE
      WHEN bool_or(ia.status = 'bevat') THEN 'bevat'
      WHEN bool_or(ia.status = 'kan_bevatten') THEN 'kan_bevatten'
      WHEN bool_or(ia.status = 'onbekend') THEN 'onbekend'
      ELSE 'geen'
    END
  FROM public.recept_ingredienten ri
  JOIN public.ingredient_allergenen ia ON ia.ingredient_id = ri.ingredient_id
  WHERE ri.recept_id = v_recept_id
  GROUP BY ia.allergeen_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_recalc_allergenen
  AFTER INSERT OR UPDATE OR DELETE ON public.recept_ingredienten
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_recept_allergenen();

-- =============================================
-- 5. INDEXES
-- =============================================

CREATE INDEX idx_recepten_location ON public.recepten(location_id);
CREATE INDEX idx_recepten_location_type ON public.recepten(location_id, type);
CREATE INDEX idx_recept_ingredienten_recept ON public.recept_ingredienten(recept_id);
CREATE INDEX idx_recept_ingredienten_ingredient ON public.recept_ingredienten(ingredient_id);
CREATE INDEX idx_halffabricaat_methodes_recept ON public.halffabricaat_methodes(recept_id);

-- =============================================
-- 6. RLS
-- =============================================

ALTER TABLE public.recepten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recept_ingredienten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recept_allergenen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.halffabricaat_methodes ENABLE ROW LEVEL SECURITY;

-- recepten policies
CREATE POLICY "recepten_select" ON public.recepten
  FOR SELECT TO authenticated
  USING (public.user_has_location_access((SELECT auth.uid()), location_id));

CREATE POLICY "recepten_insert" ON public.recepten
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager']::location_role[]));

CREATE POLICY "recepten_update" ON public.recepten
  FOR UPDATE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager']::location_role[]));

CREATE POLICY "recepten_delete" ON public.recepten
  FOR DELETE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager']::location_role[]));

-- recept_ingredienten policies (via JOIN)
CREATE POLICY "recept_ingredienten_select" ON public.recept_ingredienten
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recepten r
    WHERE r.id = recept_id AND public.user_has_location_access((SELECT auth.uid()), r.location_id)
  ));

CREATE POLICY "recept_ingredienten_insert" ON public.recept_ingredienten
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.recepten r
    WHERE r.id = recept_id AND public.user_has_role_in_location((SELECT auth.uid()), r.location_id, ARRAY['owner','manager']::location_role[])
  ));

CREATE POLICY "recept_ingredienten_update" ON public.recept_ingredienten
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recepten r
    WHERE r.id = recept_id AND public.user_has_role_in_location((SELECT auth.uid()), r.location_id, ARRAY['owner','manager']::location_role[])
  ));

CREATE POLICY "recept_ingredienten_delete" ON public.recept_ingredienten
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recepten r
    WHERE r.id = recept_id AND public.user_has_role_in_location((SELECT auth.uid()), r.location_id, ARRAY['owner','manager']::location_role[])
  ));

-- recept_allergenen policies (via JOIN)
CREATE POLICY "recept_allergenen_select" ON public.recept_allergenen
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recepten r
    WHERE r.id = recept_id AND public.user_has_location_access((SELECT auth.uid()), r.location_id)
  ));

CREATE POLICY "recept_allergenen_insert" ON public.recept_allergenen
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.recepten r
    WHERE r.id = recept_id AND public.user_has_role_in_location((SELECT auth.uid()), r.location_id, ARRAY['owner','manager']::location_role[])
  ));

CREATE POLICY "recept_allergenen_update" ON public.recept_allergenen
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recepten r
    WHERE r.id = recept_id AND public.user_has_role_in_location((SELECT auth.uid()), r.location_id, ARRAY['owner','manager']::location_role[])
  ));

CREATE POLICY "recept_allergenen_delete" ON public.recept_allergenen
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recepten r
    WHERE r.id = recept_id AND public.user_has_role_in_location((SELECT auth.uid()), r.location_id, ARRAY['owner','manager']::location_role[])
  ));

-- halffabricaat_methodes policies (via JOIN)
CREATE POLICY "halffabricaat_methodes_select" ON public.halffabricaat_methodes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recepten r
    WHERE r.id = recept_id AND public.user_has_location_access((SELECT auth.uid()), r.location_id)
  ));

CREATE POLICY "halffabricaat_methodes_insert" ON public.halffabricaat_methodes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.recepten r
    WHERE r.id = recept_id AND public.user_has_role_in_location((SELECT auth.uid()), r.location_id, ARRAY['owner','manager']::location_role[])
  ));

CREATE POLICY "halffabricaat_methodes_update" ON public.halffabricaat_methodes
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recepten r
    WHERE r.id = recept_id AND public.user_has_role_in_location((SELECT auth.uid()), r.location_id, ARRAY['owner','manager']::location_role[])
  ));

CREATE POLICY "halffabricaat_methodes_delete" ON public.halffabricaat_methodes
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recepten r
    WHERE r.id = recept_id AND public.user_has_role_in_location((SELECT auth.uid()), r.location_id, ARRAY['owner','manager']::location_role[])
  ));
