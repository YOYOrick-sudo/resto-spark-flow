-- =========================================================
-- Factuur Enterprise Pass — schema uitbreiding
-- =========================================================

-- 1) factuur_uploads: BTW + retry + blocked reason
ALTER TABLE public.factuur_uploads
  ADD COLUMN IF NOT EXISTS subtotaal_excl_btw numeric(10,2),
  ADD COLUMN IF NOT EXISTS btw_bedrag         numeric(10,2),
  ADD COLUMN IF NOT EXISTS btw_percentage     integer,
  ADD COLUMN IF NOT EXISTS totaal_incl_btw    numeric(10,2),
  ADD COLUMN IF NOT EXISTS validation_retries integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS validation_blocked_reason text;

-- BTW-percentage moet NL-tarief zijn (0/9/21) of NULL bij meerdere tarieven
ALTER TABLE public.factuur_uploads
  DROP CONSTRAINT IF EXISTS factuur_uploads_btw_pct_check;
ALTER TABLE public.factuur_uploads
  ADD CONSTRAINT factuur_uploads_btw_pct_check
  CHECK (btw_percentage IS NULL OR btw_percentage IN (0, 9, 21));

-- 2) factuur_regels: per-regel validation flag
ALTER TABLE public.factuur_regels
  ADD COLUMN IF NOT EXISTS validation_error boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS validation_error_reden text;

-- 3) Documentatie via COMMENT ON COLUMN
COMMENT ON COLUMN public.factuur_uploads.status IS
  'review | review_blocked | goedgekeurd | afgewezen';
COMMENT ON COLUMN public.factuur_uploads.subtotaal_excl_btw IS
  'Netto subtotaal van leverancier. Moet kloppen met som(factuur_regels.totaal).';
COMMENT ON COLUMN public.factuur_uploads.btw_bedrag IS
  'BTW-bedrag (positief). Som van alle BTW-tarieven indien meerdere op één factuur.';
COMMENT ON COLUMN public.factuur_uploads.btw_percentage IS
  'Uniform NL BTW-tarief (0/9/21). NULL bij meerdere tarieven of onbekend.';
COMMENT ON COLUMN public.factuur_uploads.totaal_incl_btw IS
  'Bruto eindbedrag = subtotaal_excl_btw + btw_bedrag.';
COMMENT ON COLUMN public.factuur_uploads.validation_retries IS
  'Aantal AI-retries voor sum-mismatch (max 1). Bespaart kosten bij hopeloze parses.';
COMMENT ON COLUMN public.factuur_uploads.validation_blocked_reason IS
  'NL chef-leesbare reden voor review_blocked status. Wordt getoond in FactuurBlockedBanner.';
COMMENT ON COLUMN public.factuur_regels.validation_error IS
  'TRUE = qty × prijs ≠ totaal op deze regel. Wordt uitgesloten van kostprijs-update.';
COMMENT ON COLUMN public.factuur_regels.validation_error_reden IS
  'NL beschrijving van de rekenmismatch op deze regel.';

-- 4) RLS check: bestaande policies op factuur_uploads / factuur_regels
-- werken op rij-niveau (USING/WITH CHECK), dus nieuwe kolommen worden
-- automatisch gedekt. Geen nieuwe policies nodig.
