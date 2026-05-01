-- Sprint A.1: Bitemporal yield-tracking per halffabricaat-methode
-- Pattern: bitemporal modeling (effective_period + assertion_period)
-- Architectuur-referentie: SHOUF_ARCHITECTUUR_v0.6_H3 — Deel E (Bitemporale snapshot-laag)
-- Rollback: DROP TABLE recipe_yield CASCADE; (btree_gist extension laten staan)

-- 1. Extension (idempotent)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Table
CREATE TABLE IF NOT EXISTS public.recipe_yield (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  halffabricaat_methode_id UUID NOT NULL REFERENCES public.halffabricaat_methodes(id) ON DELETE CASCADE,
  yield_pct NUMERIC(6,4) NOT NULL CHECK (yield_pct > 0 AND yield_pct <= 2),
  effective_period TSTZRANGE NOT NULL,
  assertion_period TSTZRANGE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('industry_default','observed','manual_override','imported','correction')),
  correction_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT recipe_yield_no_overlap EXCLUDE USING gist (
    halffabricaat_methode_id WITH =,
    effective_period WITH &&,
    assertion_period WITH &&
  )
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_recipe_yield_methode ON public.recipe_yield(halffabricaat_methode_id);
CREATE INDEX IF NOT EXISTS idx_recipe_yield_effective ON public.recipe_yield USING gist (effective_period);
CREATE INDEX IF NOT EXISTS idx_recipe_yield_assertion ON public.recipe_yield USING gist (assertion_period);

-- 4. RLS
ALTER TABLE public.recipe_yield ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recipe_yield_select ON public.recipe_yield;
CREATE POLICY recipe_yield_select ON public.recipe_yield
FOR SELECT
USING (
  public.is_platform_user(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.halffabricaat_methodes hm
    JOIN public.recepten r ON r.id = hm.recept_id
    WHERE hm.id = recipe_yield.halffabricaat_methode_id
      AND public.user_has_location_access(auth.uid(), r.location_id)
  )
);

DROP POLICY IF EXISTS recipe_yield_insert ON public.recipe_yield;
CREATE POLICY recipe_yield_insert ON public.recipe_yield
FOR INSERT
WITH CHECK (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.halffabricaat_methodes hm
    JOIN public.recepten r ON r.id = hm.recept_id
    WHERE hm.id = recipe_yield.halffabricaat_methode_id
      AND public.user_has_role_in_location(auth.uid(), r.location_id, ARRAY['owner','manager','kitchen']::location_role[])
  )
);

DROP POLICY IF EXISTS recipe_yield_update ON public.recipe_yield;
CREATE POLICY recipe_yield_update ON public.recipe_yield
FOR UPDATE
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.halffabricaat_methodes hm
    JOIN public.recepten r ON r.id = hm.recept_id
    WHERE hm.id = recipe_yield.halffabricaat_methode_id
      AND public.user_has_role_in_location(auth.uid(), r.location_id, ARRAY['owner','manager','kitchen']::location_role[])
  )
);

DROP POLICY IF EXISTS recipe_yield_delete ON public.recipe_yield;
CREATE POLICY recipe_yield_delete ON public.recipe_yield
FOR DELETE
USING (
  public.is_platform_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.halffabricaat_methodes hm
    JOIN public.recepten r ON r.id = hm.recept_id
    WHERE hm.id = recipe_yield.halffabricaat_methode_id
      AND public.user_has_role_in_location(auth.uid(), r.location_id, ARRAY['owner','manager']::location_role[])
  )
);

-- 5. Seed: yield_pct = 1.0 voor elke bestaande methode (idempotent via NOT EXISTS)
INSERT INTO public.recipe_yield (
  halffabricaat_methode_id,
  yield_pct,
  effective_period,
  assertion_period,
  source
)
SELECT
  hm.id,
  1.0,
  tstzrange(now(), NULL, '[)'),
  tstzrange(now(), NULL, '[)'),
  'industry_default'
FROM public.halffabricaat_methodes hm
WHERE NOT EXISTS (
  SELECT 1 FROM public.recipe_yield ry
  WHERE ry.halffabricaat_methode_id = hm.id
);