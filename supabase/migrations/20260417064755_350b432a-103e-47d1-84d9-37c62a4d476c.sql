-- 1a: Trigger function naar EN-waardes
CREATE OR REPLACE FUNCTION public.validate_factuur_regels_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.match_status NOT IN ('matched', 'manual', 'unmatched', 'skipped') THEN
    RAISE EXCEPTION 'Invalid match_status: %. Allowed: matched, manual, unmatched, skipped', NEW.match_status;
  END IF;
  RETURN NEW;
END;
$$;

-- 1b: Unique constraint op (leverancier_id, artikel_nummer) — alleen waar beide niet NULL
CREATE UNIQUE INDEX IF NOT EXISTS leveranciers_artikelen_lev_artnr_unique
  ON public.leveranciers_artikelen (leverancier_id, artikel_nummer)
  WHERE artikel_nummer IS NOT NULL;