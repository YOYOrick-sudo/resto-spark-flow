
-- Sprint D.6b — Factuur AI Ronde 1 (final)

-- =====================================================
-- 3. leverancier_aliassen
-- =====================================================
CREATE TABLE public.leverancier_aliassen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  leverancier_id UUID NOT NULL REFERENCES public.leveranciers(id) ON DELETE CASCADE,
  alias_naam TEXT NOT NULL,
  bron VARCHAR(20) NOT NULL DEFAULT 'factuur',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(leverancier_id, alias_naam)
);

ALTER TABLE public.leverancier_aliassen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leverancier_aliassen_select" ON public.leverancier_aliassen
  FOR SELECT TO authenticated
  USING (user_has_location_access(auth.uid(), (SELECT location_id FROM public.leveranciers WHERE id = leverancier_id)));

CREATE POLICY "leverancier_aliassen_insert" ON public.leverancier_aliassen
  FOR INSERT TO authenticated
  WITH CHECK (user_has_location_access(auth.uid(), (SELECT location_id FROM public.leveranciers WHERE id = leverancier_id)));

CREATE POLICY "leverancier_aliassen_update" ON public.leverancier_aliassen
  FOR UPDATE TO authenticated
  USING (user_has_location_access(auth.uid(), (SELECT location_id FROM public.leveranciers WHERE id = leverancier_id)));

CREATE POLICY "leverancier_aliassen_delete" ON public.leverancier_aliassen
  FOR DELETE TO authenticated
  USING (user_has_location_access(auth.uid(), (SELECT location_id FROM public.leveranciers WHERE id = leverancier_id)));

CREATE INDEX idx_leverancier_aliassen_naam_trgm
  ON public.leverancier_aliassen USING GIN (alias_naam gin_trgm_ops);

-- Validation trigger for bron
CREATE OR REPLACE FUNCTION public.validate_alias_bron()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bron NOT IN ('factuur', 'handmatig', 'import') THEN
    RAISE EXCEPTION 'Invalid bron value';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_leverancier_alias_bron
  BEFORE INSERT OR UPDATE ON public.leverancier_aliassen
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_alias_bron();

CREATE TRIGGER update_leverancier_aliassen_updated_at
  BEFORE UPDATE ON public.leverancier_aliassen
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4. ingredient_aliassen
-- =====================================================
CREATE TABLE public.ingredient_aliassen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id UUID NOT NULL REFERENCES public.ingredienten(id) ON DELETE CASCADE,
  alias_naam TEXT NOT NULL,
  leverancier_id UUID REFERENCES public.leveranciers(id) ON DELETE SET NULL,
  artikelnummer TEXT,
  bron VARCHAR(20) NOT NULL DEFAULT 'factuur',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ingredient_id, alias_naam, leverancier_id)
);

ALTER TABLE public.ingredient_aliassen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ingredient_aliassen_select" ON public.ingredient_aliassen
  FOR SELECT TO authenticated
  USING (user_has_location_access(auth.uid(), (SELECT location_id FROM public.ingredienten WHERE id = ingredient_id)));

CREATE POLICY "ingredient_aliassen_insert" ON public.ingredient_aliassen
  FOR INSERT TO authenticated
  WITH CHECK (user_has_location_access(auth.uid(), (SELECT location_id FROM public.ingredienten WHERE id = ingredient_id)));

CREATE POLICY "ingredient_aliassen_update" ON public.ingredient_aliassen
  FOR UPDATE TO authenticated
  USING (user_has_location_access(auth.uid(), (SELECT location_id FROM public.ingredienten WHERE id = ingredient_id)));

CREATE POLICY "ingredient_aliassen_delete" ON public.ingredient_aliassen
  FOR DELETE TO authenticated
  USING (user_has_location_access(auth.uid(), (SELECT location_id FROM public.ingredienten WHERE id = ingredient_id)));

CREATE INDEX idx_ingredient_aliassen_naam_trgm
  ON public.ingredient_aliassen USING GIN (alias_naam gin_trgm_ops);

CREATE INDEX idx_ingredient_aliassen_artikelnummer
  ON public.ingredient_aliassen (artikelnummer) WHERE artikelnummer IS NOT NULL;

CREATE TRIGGER trg_validate_ingredient_alias_bron
  BEFORE INSERT OR UPDATE ON public.ingredient_aliassen
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_alias_bron();

CREATE TRIGGER update_ingredient_aliassen_updated_at
  BEFORE UPDATE ON public.ingredient_aliassen
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. record_factuur_correction() — SECURITY DEFINER
-- =====================================================
CREATE OR REPLACE FUNCTION public.record_factuur_correction(
  p_ingredient_id UUID,
  p_alias_naam TEXT,
  p_leverancier_id UUID DEFAULT NULL,
  p_artikelnummer TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ingredient_aliassen (ingredient_id, alias_naam, leverancier_id, artikelnummer, bron)
  VALUES (p_ingredient_id, p_alias_naam, p_leverancier_id, p_artikelnummer, 'handmatig')
  ON CONFLICT (ingredient_id, alias_naam, leverancier_id) DO UPDATE
  SET artikelnummer = COALESCE(EXCLUDED.artikelnummer, ingredient_aliassen.artikelnummer),
      updated_at = now();
END;
$$;
