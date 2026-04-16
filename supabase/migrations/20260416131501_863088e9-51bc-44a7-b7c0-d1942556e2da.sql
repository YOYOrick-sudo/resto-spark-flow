
-- Sprint D.4c — Multi-vestiging productiedeling (Ronde 1)

-- =====================================================
-- 1. recepten.productie_location_id
-- =====================================================
ALTER TABLE public.recepten ADD COLUMN IF NOT EXISTS productie_location_id UUID REFERENCES public.locations(id);
CREATE INDEX IF NOT EXISTS idx_recepten_productie_location ON public.recepten (productie_location_id);

-- Backfill: zet productie_location_id gelijk aan location_id waar nog niet ingevuld
UPDATE public.recepten SET productie_location_id = location_id WHERE productie_location_id IS NULL;

-- =====================================================
-- 2. locations: role + evaluatietijden
-- =====================================================
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS role_in_organization VARCHAR(30) DEFAULT 'productie_service';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS einde_dienst_evaluatie_tijd TIME DEFAULT '22:30:00';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS start_dag_evaluatie_tijd TIME DEFAULT '06:00:00';

-- Validation trigger for role_in_organization (instead of CHECK)
CREATE OR REPLACE FUNCTION public.validate_location_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role_in_organization NOT IN ('productie_service', 'service_only', 'dagzaak') THEN
    RAISE EXCEPTION 'Invalid role_in_organization value';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_location_role ON public.locations;
CREATE TRIGGER trg_validate_location_role
  BEFORE INSERT OR UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_location_role();

-- =====================================================
-- 3. organizations.interne_bestellingen_enabled
-- =====================================================
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS interne_bestellingen_enabled BOOLEAN DEFAULT false;

-- =====================================================
-- 4. mep_tasks.bron_details
-- Structuur: { "bestelling_id": "uuid", "voor_locatie_id": "uuid", "split": [...] }
-- =====================================================
ALTER TABLE public.mep_tasks ADD COLUMN IF NOT EXISTS bron_details JSONB;

-- =====================================================
-- 5. gedeelde_producten_per_locatie
-- =====================================================
CREATE TABLE IF NOT EXISTS public.gedeelde_producten_per_locatie (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_type VARCHAR(20) NOT NULL, -- 'recept' of 'ingredient'
  recept_id UUID REFERENCES public.recepten(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.ingredienten(id) ON DELETE CASCADE,
  locatie_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  actief BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recept_id, locatie_id),
  UNIQUE(ingredient_id, locatie_id)
);

ALTER TABLE public.gedeelde_producten_per_locatie ENABLE ROW LEVEL SECURITY;

-- Mutual exclusion trigger: recept_id XOR ingredient_id
CREATE OR REPLACE FUNCTION public.validate_gedeeld_product_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_type NOT IN ('recept', 'ingredient') THEN
    RAISE EXCEPTION 'product_type must be recept or ingredient';
  END IF;
  IF NEW.product_type = 'recept' AND NEW.recept_id IS NULL THEN
    RAISE EXCEPTION 'recept_id is required when product_type is recept';
  END IF;
  IF NEW.product_type = 'ingredient' AND NEW.ingredient_id IS NULL THEN
    RAISE EXCEPTION 'ingredient_id is required when product_type is ingredient';
  END IF;
  IF NEW.recept_id IS NOT NULL AND NEW.ingredient_id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot set both recept_id and ingredient_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_gedeeld_product ON public.gedeelde_producten_per_locatie;
CREATE TRIGGER trg_validate_gedeeld_product
  BEFORE INSERT OR UPDATE ON public.gedeelde_producten_per_locatie
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_gedeeld_product_type();

-- RLS: users in same organization can manage shared products
CREATE POLICY "gedeelde_producten_select" ON public.gedeelde_producten_per_locatie
  FOR SELECT TO authenticated
  USING (user_has_location_access(auth.uid(), locatie_id));

CREATE POLICY "gedeelde_producten_insert" ON public.gedeelde_producten_per_locatie
  FOR INSERT TO authenticated
  WITH CHECK (user_has_location_access(auth.uid(), locatie_id));

CREATE POLICY "gedeelde_producten_update" ON public.gedeelde_producten_per_locatie
  FOR UPDATE TO authenticated
  USING (user_has_location_access(auth.uid(), locatie_id));

CREATE POLICY "gedeelde_producten_delete" ON public.gedeelde_producten_per_locatie
  FOR DELETE TO authenticated
  USING (user_has_location_access(auth.uid(), locatie_id));

CREATE INDEX IF NOT EXISTS idx_gedeelde_producten_locatie ON public.gedeelde_producten_per_locatie (locatie_id);
CREATE INDEX IF NOT EXISTS idx_gedeelde_producten_recept ON public.gedeelde_producten_per_locatie (recept_id) WHERE recept_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gedeelde_producten_ingredient ON public.gedeelde_producten_per_locatie (ingredient_id) WHERE ingredient_id IS NOT NULL;

-- updated_at trigger
CREATE TRIGGER update_gedeelde_producten_updated_at
  BEFORE UPDATE ON public.gedeelde_producten_per_locatie
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. View: gedeelde_halffabricaten_cross_locatie
-- =====================================================
CREATE OR REPLACE VIEW public.gedeelde_halffabricaten_cross_locatie AS
SELECT
  gp.id AS gedeeld_product_id,
  gp.product_type,
  gp.recept_id,
  gp.ingredient_id,
  gp.locatie_id AS ontvangende_locatie_id,
  ontv.name AS ontvangende_locatie_naam,
  r.naam AS recept_naam,
  r.location_id AS productie_locatie_id,
  prod.name AS productie_locatie_naam,
  gp.actief,
  gp.created_at
FROM public.gedeelde_producten_per_locatie gp
LEFT JOIN public.recepten r ON r.id = gp.recept_id
LEFT JOIN public.locations ontv ON ontv.id = gp.locatie_id
LEFT JOIN public.locations prod ON prod.id = r.productie_location_id
WHERE gp.product_type = 'recept';

-- =====================================================
-- Documentatie: Autonomie instelling
-- =====================================================
-- Autonomie key: locations.ai_bevoegdheden_keuken JSONB
-- → key "interne_transfers_autonomie" met waarden:
--   "uit"         = geen automatische transfers
--   "melden"      = AI meldt suggestie, mens beslist (DEFAULT)
--   "zelfstandig"  = AI mag zelfstandig interne bestellingen plaatsen
-- Default bij nieuwe locations: "melden"
-- Uitlezen: (ai_bevoegdheden_keuken->>'interne_transfers_autonomie')::text
-- Fallback in code: COALESCE(waarde, 'melden')
