ALTER TABLE public.factuur_regels
  ADD COLUMN IF NOT EXISTS validation_corrected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS validation_correction_path TEXT,
  ADD COLUMN IF NOT EXISTS validation_ambiguous BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.factuur_regels.validation_corrected IS
  'Validator heeft hoeveelheid/prijs auto-gecorrigeerd o.b.v. verpakking-conversie';
COMMENT ON COLUMN public.factuur_regels.validation_correction_path IS
  'Welke check triggerde de auto-fix: packaging_base_price | packaging_item_qty';
COMMENT ON COLUMN public.factuur_regels.validation_ambiguous IS
  'Meerdere berekeningen klopten — gemarkeerd voor manager-awareness, niet geblokkeerd';