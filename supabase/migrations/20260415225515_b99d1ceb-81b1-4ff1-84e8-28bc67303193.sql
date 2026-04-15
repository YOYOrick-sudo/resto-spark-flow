ALTER TABLE leveranciers_artikelen 
  ADD COLUMN IF NOT EXISTS import_bestandsnaam VARCHAR(255),
  ADD COLUMN IF NOT EXISTS laatst_geimporteerd TIMESTAMPTZ;