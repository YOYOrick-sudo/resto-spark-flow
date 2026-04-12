
-- ============================================================
-- 1. ALLERGENEN — global reference table
-- ============================================================
CREATE TABLE public.allergenen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  naam_nl TEXT NOT NULL,
  naam_en TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.allergenen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allergenen_select_authenticated"
  ON public.allergenen FOR SELECT TO authenticated
  USING (true);

-- Seed 14 EU allergens
INSERT INTO public.allergenen (code, naam_nl, naam_en, sort_order) VALUES
  ('gluten',        'Gluten',        'Gluten',        1),
  ('schaaldieren',  'Schaaldieren',  'Crustaceans',   2),
  ('eieren',        'Eieren',        'Eggs',          3),
  ('vis',           'Vis',           'Fish',          4),
  ('pindas',        'Pinda''s',      'Peanuts',       5),
  ('soja',          'Soja',          'Soy',           6),
  ('melk',          'Melk',          'Milk',          7),
  ('noten',         'Noten',         'Tree nuts',     8),
  ('selderij',      'Selderij',      'Celery',        9),
  ('mosterd',       'Mosterd',       'Mustard',       10),
  ('sesamzaad',     'Sesamzaad',     'Sesame seeds',  11),
  ('sulfieten',     'Sulfieten',     'Sulphites',     12),
  ('lupine',        'Lupine',        'Lupin',         13),
  ('weekdieren',    'Weekdieren',    'Molluscs',      14);

-- ============================================================
-- 2. INGREDIENTEN
-- ============================================================
CREATE TABLE public.ingredienten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  naam VARCHAR(255) NOT NULL,
  categorie VARCHAR(100) NOT NULL,
  eenheid VARCHAR(20) NOT NULL,
  kostprijs DECIMAL(10,4),
  kostprijs_bron VARCHAR(20),
  kostprijs_laatst_bijgewerkt TIMESTAMPTZ,
  yield_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  voorraad DECIMAL(10,2) NOT NULL DEFAULT 0,
  min_voorraad DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_voorraad DECIMAL(10,2),
  opslag_type VARCHAR(20),
  opslag_locatie VARCHAR(100),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, naam)
);

-- Validation triggers instead of CHECK constraints
CREATE OR REPLACE FUNCTION public.validate_ingredienten()
  RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.eenheid NOT IN ('kg','g','L','ml','st') THEN
    RAISE EXCEPTION 'Invalid eenheid: %', NEW.eenheid;
  END IF;
  IF NEW.kostprijs_bron IS NOT NULL AND NEW.kostprijs_bron NOT IN ('api','handmatig','email','upload') THEN
    RAISE EXCEPTION 'Invalid kostprijs_bron: %', NEW.kostprijs_bron;
  END IF;
  IF NEW.opslag_type IS NOT NULL AND NEW.opslag_type NOT IN ('koeling','vriezer','droog','overig') THEN
    RAISE EXCEPTION 'Invalid opslag_type: %', NEW.opslag_type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_ingredienten
  BEFORE INSERT OR UPDATE ON public.ingredienten
  FOR EACH ROW EXECUTE FUNCTION public.validate_ingredienten();

-- updated_at trigger
CREATE TRIGGER update_ingredienten_updated_at
  BEFORE UPDATE ON public.ingredienten
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_ingredienten_location ON public.ingredienten(location_id);
CREATE INDEX idx_ingredienten_location_categorie ON public.ingredienten(location_id, categorie);

-- RLS
ALTER TABLE public.ingredienten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingredienten_select"
  ON public.ingredienten FOR SELECT TO authenticated
  USING (location_id IN (
    SELECT ulr.location_id FROM public.user_location_roles ulr
    WHERE ulr.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "ingredienten_insert"
  ON public.ingredienten FOR INSERT TO authenticated
  WITH CHECK (public.user_has_role_in_location(
    (SELECT auth.uid()), location_id, ARRAY['owner','manager']::public.location_role[]
  ));

CREATE POLICY "ingredienten_update"
  ON public.ingredienten FOR UPDATE TO authenticated
  USING (public.user_has_role_in_location(
    (SELECT auth.uid()), location_id, ARRAY['owner','manager']::public.location_role[]
  ));

CREATE POLICY "ingredienten_delete"
  ON public.ingredienten FOR DELETE TO authenticated
  USING (public.user_has_role_in_location(
    (SELECT auth.uid()), location_id, ARRAY['owner','manager']::public.location_role[]
  ));

-- ============================================================
-- 3. INGREDIENT_ALLERGENEN
-- ============================================================
CREATE TABLE public.ingredient_allergenen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredienten(id) ON DELETE CASCADE,
  allergeen_id UUID NOT NULL REFERENCES public.allergenen(id),
  status VARCHAR(15) NOT NULL,
  bron VARCHAR(20),
  laatst_bijgewerkt TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ingredient_id, allergeen_id)
);

CREATE OR REPLACE FUNCTION public.validate_ingredient_allergenen()
  RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('bevat','kan_bevatten','geen','onbekend') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.bron IS NOT NULL AND NEW.bron NOT IN ('api','handmatig','onbekend') THEN
    RAISE EXCEPTION 'Invalid bron: %', NEW.bron;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_ingredient_allergenen
  BEFORE INSERT OR UPDATE ON public.ingredient_allergenen
  FOR EACH ROW EXECUTE FUNCTION public.validate_ingredient_allergenen();

ALTER TABLE public.ingredient_allergenen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingredient_allergenen_select"
  ON public.ingredient_allergenen FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ingredienten i
    JOIN public.user_location_roles ulr ON ulr.location_id = i.location_id
    WHERE i.id = ingredient_id AND ulr.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "ingredient_allergenen_insert"
  ON public.ingredient_allergenen FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = ingredient_id
    AND public.user_has_role_in_location(
      (SELECT auth.uid()), i.location_id, ARRAY['owner','manager']::public.location_role[]
    )
  ));

CREATE POLICY "ingredient_allergenen_update"
  ON public.ingredient_allergenen FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = ingredient_id
    AND public.user_has_role_in_location(
      (SELECT auth.uid()), i.location_id, ARRAY['owner','manager']::public.location_role[]
    )
  ));

CREATE POLICY "ingredient_allergenen_delete"
  ON public.ingredient_allergenen FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = ingredient_id
    AND public.user_has_role_in_location(
      (SELECT auth.uid()), i.location_id, ARRAY['owner','manager']::public.location_role[]
    )
  ));

-- ============================================================
-- 4. EENHEID_CONVERSIES
-- ============================================================
CREATE TABLE public.eenheid_conversies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredienten(id) ON DELETE CASCADE,
  van_eenheid VARCHAR(20) NOT NULL,
  naar_eenheid VARCHAR(20) NOT NULL,
  factor DECIMAL(10,4) NOT NULL,
  UNIQUE(ingredient_id, van_eenheid, naar_eenheid)
);

ALTER TABLE public.eenheid_conversies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eenheid_conversies_select"
  ON public.eenheid_conversies FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ingredienten i
    JOIN public.user_location_roles ulr ON ulr.location_id = i.location_id
    WHERE i.id = ingredient_id AND ulr.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "eenheid_conversies_insert"
  ON public.eenheid_conversies FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = ingredient_id
    AND public.user_has_role_in_location(
      (SELECT auth.uid()), i.location_id, ARRAY['owner','manager']::public.location_role[]
    )
  ));

CREATE POLICY "eenheid_conversies_update"
  ON public.eenheid_conversies FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = ingredient_id
    AND public.user_has_role_in_location(
      (SELECT auth.uid()), i.location_id, ARRAY['owner','manager']::public.location_role[]
    )
  ));

CREATE POLICY "eenheid_conversies_delete"
  ON public.eenheid_conversies FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = ingredient_id
    AND public.user_has_role_in_location(
      (SELECT auth.uid()), i.location_id, ARRAY['owner','manager']::public.location_role[]
    )
  ));

-- ============================================================
-- 5. VOORRAAD_BEWEGINGEN
-- ============================================================
CREATE TABLE public.voorraad_bewegingen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredienten(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  hoeveelheid DECIMAL(10,2) NOT NULL,
  bron VARCHAR(100),
  referentie_type VARCHAR(50),
  referentie_id UUID,
  medewerker_id UUID REFERENCES public.profiles(id),
  opmerking TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_voorraad_bewegingen()
  RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.type NOT IN ('IN','OUT','CORRECTIE','WASTE','TRANSFER') THEN
    RAISE EXCEPTION 'Invalid type: %', NEW.type;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_voorraad_bewegingen
  BEFORE INSERT OR UPDATE ON public.voorraad_bewegingen
  FOR EACH ROW EXECUTE FUNCTION public.validate_voorraad_bewegingen();

-- Indexes
CREATE INDEX idx_voorraad_bewegingen_ingredient ON public.voorraad_bewegingen(ingredient_id);
CREATE INDEX idx_voorraad_bewegingen_created ON public.voorraad_bewegingen(created_at DESC);

ALTER TABLE public.voorraad_bewegingen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voorraad_bewegingen_select"
  ON public.voorraad_bewegingen FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ingredienten i
    JOIN public.user_location_roles ulr ON ulr.location_id = i.location_id
    WHERE i.id = ingredient_id AND ulr.user_id = (SELECT auth.uid())
  ));

CREATE POLICY "voorraad_bewegingen_insert"
  ON public.voorraad_bewegingen FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = ingredient_id
    AND public.user_has_role_in_location(
      (SELECT auth.uid()), i.location_id, ARRAY['owner','manager']::public.location_role[]
    )
  ));

CREATE POLICY "voorraad_bewegingen_update"
  ON public.voorraad_bewegingen FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = ingredient_id
    AND public.user_has_role_in_location(
      (SELECT auth.uid()), i.location_id, ARRAY['owner','manager']::public.location_role[]
    )
  ));

CREATE POLICY "voorraad_bewegingen_delete"
  ON public.voorraad_bewegingen FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = ingredient_id
    AND public.user_has_role_in_location(
      (SELECT auth.uid()), i.location_id, ARRAY['owner','manager']::public.location_role[]
    )
  ));
