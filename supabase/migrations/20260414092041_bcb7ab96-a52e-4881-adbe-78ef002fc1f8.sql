-- 1. gerecht_categorieen op locations
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS gerecht_categorieen JSONB 
DEFAULT '["Voorgerechten","Hoofdgerechten","Desserts","Bijgerechten","Dranken","Overig"]';

-- 2. gerechten tabel
CREATE TABLE public.gerechten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  naam VARCHAR(255) NOT NULL,
  categorie VARCHAR(50) NOT NULL DEFAULT 'overig',
  beschrijving TEXT,
  verkoopprijs DECIMAL(10,2),
  kostprijs DECIMAL(10,2) NOT NULL DEFAULT 0,
  marge_percentage DECIMAL(5,2),
  foto_url TEXT,
  is_actief BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gerechten_loc_cat ON public.gerechten(location_id, categorie);
CREATE INDEX idx_gerechten_loc_archived ON public.gerechten(location_id, is_archived);

CREATE TRIGGER update_gerechten_updated_at
  BEFORE UPDATE ON public.gerechten
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.gerechten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gerechten_select" ON public.gerechten
  FOR SELECT TO authenticated
  USING (public.user_has_location_access((SELECT auth.uid()), location_id));
CREATE POLICY "gerechten_insert" ON public.gerechten
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager','kitchen']::public.location_role[]));
CREATE POLICY "gerechten_update" ON public.gerechten
  FOR UPDATE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager','kitchen']::public.location_role[]));
CREATE POLICY "gerechten_delete" ON public.gerechten
  FOR DELETE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager']::public.location_role[]));

-- 3. gerecht_componenten tabel
CREATE TABLE public.gerecht_componenten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gerecht_id UUID NOT NULL REFERENCES public.gerechten(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  recept_id UUID REFERENCES public.recepten(id) ON DELETE SET NULL,
  ingredient_id UUID REFERENCES public.ingredienten(id) ON DELETE SET NULL,
  hoeveelheid DECIMAL(10,3) NOT NULL,
  eenheid VARCHAR(20) NOT NULL,
  kostprijs_snapshot DECIMAL(10,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_gerecht_component()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type NOT IN ('halffabricaat', 'ingredient') THEN
    RAISE EXCEPTION 'Invalid type: %', NEW.type;
  END IF;
  IF NEW.type = 'halffabricaat' AND (NEW.recept_id IS NULL OR NEW.ingredient_id IS NOT NULL) THEN
    RAISE EXCEPTION 'halffabricaat must have recept_id and no ingredient_id';
  END IF;
  IF NEW.type = 'ingredient' AND (NEW.ingredient_id IS NULL OR NEW.recept_id IS NOT NULL) THEN
    RAISE EXCEPTION 'ingredient must have ingredient_id and no recept_id';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_gerecht_component
  BEFORE INSERT OR UPDATE ON public.gerecht_componenten
  FOR EACH ROW EXECUTE FUNCTION public.validate_gerecht_component();

CREATE INDEX idx_gerecht_comp_gerecht ON public.gerecht_componenten(gerecht_id);
CREATE INDEX idx_gerecht_comp_recept ON public.gerecht_componenten(recept_id);
CREATE INDEX idx_gerecht_comp_ingredient ON public.gerecht_componenten(ingredient_id);

ALTER TABLE public.gerecht_componenten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gerecht_comp_select" ON public.gerecht_componenten
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gerechten g WHERE g.id = gerecht_componenten.gerecht_id AND public.user_has_location_access((SELECT auth.uid()), g.location_id)));
CREATE POLICY "gerecht_comp_insert" ON public.gerecht_componenten
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.gerechten g WHERE g.id = gerecht_componenten.gerecht_id AND public.user_has_role_in_location((SELECT auth.uid()), g.location_id, ARRAY['owner','manager','kitchen']::public.location_role[])));
CREATE POLICY "gerecht_comp_update" ON public.gerecht_componenten
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gerechten g WHERE g.id = gerecht_componenten.gerecht_id AND public.user_has_role_in_location((SELECT auth.uid()), g.location_id, ARRAY['owner','manager','kitchen']::public.location_role[])));
CREATE POLICY "gerecht_comp_delete" ON public.gerecht_componenten
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.gerechten g WHERE g.id = gerecht_componenten.gerecht_id AND public.user_has_role_in_location((SELECT auth.uid()), g.location_id, ARRAY['owner','manager']::public.location_role[])));

-- 4. Kostprijs herberekening trigger
CREATE OR REPLACE FUNCTION public.herbereken_gerecht_kostprijs()
RETURNS TRIGGER AS $$
DECLARE
  total DECIMAL(10,2);
  vkp DECIMAL(10,2);
  target_id UUID;
BEGIN
  target_id := COALESCE(NEW.gerecht_id, OLD.gerecht_id);
  
  SELECT COALESCE(SUM(
    CASE 
      WHEN gc.type = 'ingredient' THEN gc.hoeveelheid * COALESCE(i.kostprijs, 0)
      WHEN gc.type = 'halffabricaat' THEN 
        gc.hoeveelheid * COALESCE(r.totale_kostprijs / NULLIF(r.porties, 0), 0)
    END
  ), 0) INTO total
  FROM gerecht_componenten gc
  LEFT JOIN ingredienten i ON gc.ingredient_id = i.id
  LEFT JOIN recepten r ON gc.recept_id = r.id
  WHERE gc.gerecht_id = target_id;

  SELECT verkoopprijs INTO vkp FROM gerechten WHERE id = target_id;

  UPDATE gerechten SET 
    kostprijs = total,
    marge_percentage = CASE 
      WHEN vkp IS NOT NULL AND vkp > 0 THEN ((vkp - total) / vkp) * 100
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = target_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_herbereken_kostprijs_insert
  AFTER INSERT ON gerecht_componenten
  FOR EACH ROW EXECUTE FUNCTION herbereken_gerecht_kostprijs();
CREATE TRIGGER trg_herbereken_kostprijs_update
  AFTER UPDATE ON gerecht_componenten
  FOR EACH ROW EXECUTE FUNCTION herbereken_gerecht_kostprijs();
CREATE TRIGGER trg_herbereken_kostprijs_delete
  AFTER DELETE ON gerecht_componenten
  FOR EACH ROW EXECUTE FUNCTION herbereken_gerecht_kostprijs();

-- 5. Marge herberekening bij verkoopprijs wijziging
CREATE OR REPLACE FUNCTION public.herbereken_gerecht_marge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verkoopprijs IS NOT NULL AND NEW.verkoopprijs > 0 THEN
    NEW.marge_percentage = ((NEW.verkoopprijs - NEW.kostprijs) / NEW.verkoopprijs) * 100;
  ELSE
    NEW.marge_percentage = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_herbereken_marge
  BEFORE UPDATE ON gerechten
  FOR EACH ROW 
  WHEN (OLD.verkoopprijs IS DISTINCT FROM NEW.verkoopprijs OR OLD.kostprijs IS DISTINCT FROM NEW.kostprijs)
  EXECUTE FUNCTION herbereken_gerecht_marge();