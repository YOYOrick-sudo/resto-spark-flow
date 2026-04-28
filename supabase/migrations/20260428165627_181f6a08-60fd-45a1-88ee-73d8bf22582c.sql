-- =========================================================================
-- SPRINT 2E LOOP 2 — Database foundation (7 secties, additief, 1 deploy)
-- =========================================================================

-- -------------------------------------------------------------------------
-- SECTIE 1 — ingredienten canonical fields + backfill
-- -------------------------------------------------------------------------
ALTER TABLE public.ingredienten
  ADD COLUMN IF NOT EXISTS measure_class text
    CHECK (measure_class IN ('weight','volume','count')),
  ADD COLUMN IF NOT EXISTS base_unit text
    CHECK (base_unit IN ('g','ml','st')),
  ADD COLUMN IF NOT EXISTS weight_per_piece_g numeric(12,4),
  ADD COLUMN IF NOT EXISTS weight_per_piece_min_g numeric(12,4),
  ADD COLUMN IF NOT EXISTS weight_per_piece_max_g numeric(12,4),
  ADD COLUMN IF NOT EXISTS density_g_per_ml numeric(8,5) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS is_variable_weight boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prefer_piece_display boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS conversion_source text
    CHECK (conversion_source IN ('ai_suggested','pakbon_learned','chef_confirmed','manual')),
  ADD COLUMN IF NOT EXISTS conversion_confidence numeric(3,2);

UPDATE public.ingredienten SET
  measure_class = CASE eenheid
    WHEN 'kg' THEN 'weight' WHEN 'g'  THEN 'weight'
    WHEN 'L'  THEN 'volume' WHEN 'l'  THEN 'volume' WHEN 'ml' THEN 'volume'
    WHEN 'st' THEN 'count'  WHEN 'stuk' THEN 'count'
    ELSE NULL END,
  base_unit = CASE eenheid
    WHEN 'kg' THEN 'g'  WHEN 'g'  THEN 'g'
    WHEN 'L'  THEN 'ml' WHEN 'l'  THEN 'ml' WHEN 'ml' THEN 'ml'
    WHEN 'st' THEN 'st' WHEN 'stuk' THEN 'st'
    ELSE NULL END
WHERE measure_class IS NULL;

-- -------------------------------------------------------------------------
-- SECTIE 2 — ingredient_packagings
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ingredient_packagings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES public.ingredienten(id) ON DELETE CASCADE,
  leverancier_id uuid REFERENCES public.leveranciers(id) ON DELETE SET NULL,
  label text NOT NULL,
  is_piece boolean NOT NULL DEFAULT false,
  is_weighted boolean NOT NULL DEFAULT false,
  pieces_in_package integer,
  factor_to_base numeric(14,6),
  factor_source text CHECK (factor_source IN ('ai_suggested','pakbon_learned','chef_confirmed','manual')),
  factor_confidence numeric(3,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ingredient_packagings_piece_xor_weight
    CHECK (NOT (is_piece AND is_weighted))
);

CREATE INDEX IF NOT EXISTS idx_ingredient_packagings_ingredient
  ON public.ingredient_packagings(ingredient_id);

ALTER TABLE public.ingredient_packagings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ip_select_via_location"
  ON public.ingredient_packagings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = ingredient_packagings.ingredient_id
      AND public.user_has_location_access(auth.uid(), i.location_id)
  ));

CREATE POLICY "ip_write_via_location_role"
  ON public.ingredient_packagings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = ingredient_packagings.ingredient_id
      AND public.user_has_role_in_location(auth.uid(), i.location_id, ARRAY['owner','manager','kitchen']::location_role[])
  ));

CREATE POLICY "ip_update_via_location_role"
  ON public.ingredient_packagings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = ingredient_packagings.ingredient_id
      AND public.user_has_role_in_location(auth.uid(), i.location_id, ARRAY['owner','manager','kitchen']::location_role[])
  ));

CREATE POLICY "ip_delete_via_location_role"
  ON public.ingredient_packagings FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = ingredient_packagings.ingredient_id
      AND public.user_has_role_in_location(auth.uid(), i.location_id, ARRAY['owner','manager','kitchen']::location_role[])
  ));

CREATE TRIGGER trg_ingredient_packagings_updated
  BEFORE UPDATE ON public.ingredient_packagings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------------------------
-- SECTIE 3 — stock_lots
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES public.ingredienten(id) ON DELETE RESTRICT,
  packaging_id uuid REFERENCES public.ingredient_packagings(id) ON DELETE SET NULL,
  goods_receipt_id uuid REFERENCES public.goods_receipts(id) ON DELETE SET NULL,
  goods_receipt_line_id uuid REFERENCES public.goods_receipt_lines(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  expires_at date,
  initial_base numeric(14,4) NOT NULL,
  remaining_base numeric(14,4) NOT NULL,
  base_unit text NOT NULL CHECK (base_unit IN ('g','ml','st')),
  unit_cost_eur numeric(12,4),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_lots_ingredient_remaining
  ON public.stock_lots(ingredient_id) WHERE remaining_base > 0;

ALTER TABLE public.stock_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sl_select_via_location"
  ON public.stock_lots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = stock_lots.ingredient_id
      AND public.user_has_location_access(auth.uid(), i.location_id)
  ));

CREATE POLICY "sl_insert_via_location_role"
  ON public.stock_lots FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = stock_lots.ingredient_id
      AND public.user_has_role_in_location(auth.uid(), i.location_id, ARRAY['owner','manager','kitchen']::location_role[])
  ));

CREATE POLICY "sl_update_via_location_role"
  ON public.stock_lots FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = stock_lots.ingredient_id
      AND public.user_has_role_in_location(auth.uid(), i.location_id, ARRAY['owner','manager','kitchen']::location_role[])
  ));

CREATE POLICY "sl_delete_via_location_role"
  ON public.stock_lots FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = stock_lots.ingredient_id
      AND public.user_has_role_in_location(auth.uid(), i.location_id, ARRAY['owner','manager','kitchen']::location_role[])
  ));

CREATE TRIGGER trg_stock_lots_updated
  BEFORE UPDATE ON public.stock_lots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------------------------
-- SECTIE 4 — stock_movements (APPEND-ONLY, dubbel vergrendeld)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id bigserial PRIMARY KEY,
  ingredient_id uuid NOT NULL REFERENCES public.ingredienten(id) ON DELETE RESTRICT,
  stock_lot_id uuid REFERENCES public.stock_lots(id) ON DELETE SET NULL,
  delta_base numeric(14,4) NOT NULL,
  base_unit text NOT NULL CHECK (base_unit IN ('g','ml','st')),
  reason text NOT NULL CHECK (reason IN (
    'goods_receipt','recipe_use','prep_use','waste','count_adjust','correction','transfer_in','transfer_out','manual'
  )),
  reference_type text,
  reference_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient_time
  ON public.stock_movements(ingredient_id, occurred_at DESC);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Alleen SELECT + INSERT policies (geen UPDATE/DELETE = append-only)
CREATE POLICY "sm_select_via_location"
  ON public.stock_movements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = stock_movements.ingredient_id
      AND public.user_has_location_access(auth.uid(), i.location_id)
  ));

CREATE POLICY "sm_insert_via_location_role"
  ON public.stock_movements FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.ingredienten i
    WHERE i.id = stock_movements.ingredient_id
      AND public.user_has_role_in_location(auth.uid(), i.location_id, ARRAY['owner','manager','kitchen']::location_role[])
  ));

-- Dubbele vergrendeling: REVOKE op privilege-niveau
REVOKE UPDATE, DELETE ON public.stock_movements FROM authenticated, anon;

-- -------------------------------------------------------------------------
-- SECTIE 5 — template_cache (cross-tenant, append-only voor users)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.template_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL UNIQUE,
  leverancier_id uuid REFERENCES public.leveranciers(id) ON DELETE SET NULL,
  leverancier_naam text,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  template_data jsonb NOT NULL,
  hit_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_cache_leverancier
  ON public.template_cache(leverancier_id);

ALTER TABLE public.template_cache ENABLE ROW LEVEL SECURITY;

-- Alleen SELECT policy (cross-tenant shared kennis)
CREATE POLICY "tc_select_all_authenticated"
  ON public.template_cache FOR SELECT
  TO authenticated
  USING (true);

-- Dubbele vergrendeling: schrijven alleen via service_role (edge functions)
REVOKE INSERT, UPDATE, DELETE ON public.template_cache FROM authenticated, anon;

-- -------------------------------------------------------------------------
-- SECTIE 6 — article_cache (per location)
-- -------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.article_cache (
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  leverancier_id uuid NOT NULL REFERENCES public.leveranciers(id) ON DELETE CASCADE,
  article_code text NOT NULL,
  description text,
  ingredient_id uuid REFERENCES public.ingredienten(id) ON DELETE SET NULL,
  packaging_id uuid REFERENCES public.ingredient_packagings(id) ON DELETE SET NULL,
  last_unit_price_eur numeric(12,4),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  hit_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (location_id, leverancier_id, article_code)
);

CREATE INDEX IF NOT EXISTS idx_article_cache_description_trgm
  ON public.article_cache USING gin (description gin_trgm_ops);

ALTER TABLE public.article_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ac_all_via_location"
  ON public.article_cache FOR ALL
  USING (public.user_has_location_access(auth.uid(), location_id))
  WITH CHECK (public.user_has_location_access(auth.uid(), location_id));

CREATE TRIGGER trg_article_cache_updated
  BEFORE UPDATE ON public.article_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------------------------
-- SECTIE 7 — document_cache (per location)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_cache (
  pdf_sha256 text NOT NULL,
  location_id uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  parsed_result jsonb NOT NULL,
  parsed_at timestamptz NOT NULL DEFAULT now(),
  model_used text,
  cost_eur numeric(10,5),
  PRIMARY KEY (pdf_sha256, location_id)
);

ALTER TABLE public.document_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dc_all_via_location"
  ON public.document_cache FOR ALL
  USING (public.user_has_location_access(auth.uid(), location_id))
  WITH CHECK (public.user_has_location_access(auth.uid(), location_id));
