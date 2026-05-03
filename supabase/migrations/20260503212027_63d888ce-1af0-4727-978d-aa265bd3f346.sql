-- Sprint A.3.1: auto-seed recipe_yield voor nieuwe halffabricaat_methodes
CREATE OR REPLACE FUNCTION public.ensure_yield_for_new_methode()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.recipe_yield
    (halffabricaat_methode_id, yield_pct, effective_period, assertion_period, source)
  VALUES (
    NEW.id,
    1.0,
    tstzrange(NOW(), NULL, '[)'),
    tstzrange(NOW(), NULL, '[)'),
    'industry_default'
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.ensure_yield_for_new_methode() IS
  'Sprint A.3.1: auto-seed industry_default yield-rij bij nieuwe halffabricaat_methode';

DROP TRIGGER IF EXISTS trg_auto_seed_yield ON public.halffabricaat_methodes;
CREATE TRIGGER trg_auto_seed_yield
AFTER INSERT ON public.halffabricaat_methodes
FOR EACH ROW EXECUTE FUNCTION public.ensure_yield_for_new_methode();