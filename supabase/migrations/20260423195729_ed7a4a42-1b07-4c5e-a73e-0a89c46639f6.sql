-- Sprint Multi-BTW + Emballage — DEEL 3
-- Per-regel BTW-tarief op factuur_regels.
-- Idempotent: IF NOT EXISTS + DO-blokken voor constraint.

ALTER TABLE public.factuur_regels
  ADD COLUMN IF NOT EXISTS btw_percentage INT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'factuur_regels_btw_percentage_check'
  ) THEN
    ALTER TABLE public.factuur_regels
      ADD CONSTRAINT factuur_regels_btw_percentage_check
      CHECK (btw_percentage IS NULL OR btw_percentage IN (0, 9, 21));
  END IF;
END $$;

COMMENT ON COLUMN public.factuur_regels.btw_percentage IS
  'Per-regel BTW tarief (NL): 9 = voedingswaren, 21 = non-food/alcohol, 0 = emballage/verlegd. NULL = onbekend, validator valt terug op factuur-niveau BTW.';