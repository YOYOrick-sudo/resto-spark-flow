
-- Sprint 2E Loop 1: Verpakking-naar-Voorraad Conversie (database)
-- ================================================================

-- Migration 1: leveranciers_artikelen — confirmation/learning velden
ALTER TABLE public.leveranciers_artikelen
  ADD COLUMN IF NOT EXISTS is_weighted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmation_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS factor_source text NOT NULL DEFAULT 'unknown';

-- CHECK constraint via DO block (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leveranciers_artikelen_factor_source_check'
  ) THEN
    ALTER TABLE public.leveranciers_artikelen
      ADD CONSTRAINT leveranciers_artikelen_factor_source_check
      CHECK (factor_source IN ('user', 'ai_confirmed', 'unknown'));
  END IF;
END$$;

-- Index voor snelle lookup van bevestigde factoren
CREATE INDEX IF NOT EXISTS idx_lev_artikel_confirmed
  ON public.leveranciers_artikelen (leverancier_id, ingredient_id)
  WHERE confirmation_count > 0;

-- Migration 2: goods_receipt_lines — AI-extractie + factor-status snapshot
ALTER TABLE public.goods_receipt_lines
  ADD COLUMN IF NOT EXISTS ai_package_unit text,
  ADD COLUMN IF NOT EXISTS ai_per_package_quantity numeric,
  ADD COLUMN IF NOT EXISTS ai_total_packages numeric,
  ADD COLUMN IF NOT EXISTS ai_total_received_quantity numeric,
  ADD COLUMN IF NOT EXISTS ai_total_received_unit text,
  ADD COLUMN IF NOT EXISTS ai_is_weighted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_reasoning text,
  ADD COLUMN IF NOT EXISTS factor_status text NOT NULL DEFAULT 'unknown';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'goods_receipt_lines_factor_status_check'
  ) THEN
    ALTER TABLE public.goods_receipt_lines
      ADD CONSTRAINT goods_receipt_lines_factor_status_check
      CHECK (factor_status IN ('confirmed', 'ai_suggested', 'manual_required', 'not_applicable', 'unknown'));
  END IF;
END$$;

-- Migration 3: Helper functie voor default voorraad-eenheden per categorie
CREATE OR REPLACE FUNCTION public.default_voorraad_eenheid(p_categorie text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(coalesce(p_categorie,'')) IN ('vlees','vis','gevogelte','orgaanvlees') THEN 'kg'
    WHEN lower(coalesce(p_categorie,'')) IN ('groenten','fruit') THEN 'stuk'
    WHEN lower(coalesce(p_categorie,'')) IN ('zuivel') THEN 'l'
    WHEN lower(coalesce(p_categorie,'')) IN ('kruiden_vers') THEN 'bos'
    WHEN lower(coalesce(p_categorie,'')) IN ('droog','specerijen') THEN 'kg'
    WHEN lower(coalesce(p_categorie,'')) IN ('drank','olie') THEN 'l'
    ELSE 'stuk'
  END;
$$;
