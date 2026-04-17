-- R3.5: verpakking-informatie op factuur_regels
ALTER TABLE public.factuur_regels
  ADD COLUMN IF NOT EXISTS verpakking_hoeveelheid numeric,
  ADD COLUMN IF NOT EXISTS verpakking_eenheid text,
  ADD COLUMN IF NOT EXISTS prijs_per_basiseenheid numeric,
  ADD COLUMN IF NOT EXISTS ai_raw_verpakking_tekst text;

COMMENT ON COLUMN public.factuur_regels.prijs_per_eenheid IS
  'Prijs zoals op factuur (per verpakking als verpakking aanwezig is, anders per basiseenheid). Source of truth voor prijs.';

COMMENT ON COLUMN public.factuur_regels.prijs_per_basiseenheid IS
  'Afgeleide prijs: prijs_per_eenheid / verpakking_hoeveelheid. Nooit door AI geleverd, altijd berekend door Nesto.';

COMMENT ON COLUMN public.factuur_regels.verpakking_hoeveelheid IS
  'Totaal aantal basiseenheden in 1 verpakking (246 voor 6×41 stuks/doos, 10 voor 2×5kg).';

COMMENT ON COLUMN public.factuur_regels.verpakking_eenheid IS
  'Verpakking-type: doos, pak, fles, krat, zak. NULL als product per basiseenheid geleverd wordt.';

COMMENT ON COLUMN public.factuur_regels.ai_raw_verpakking_tekst IS
  'Origineel tekstfragment uit factuur, bv "6×41×18gr" — voor audit en debug.';