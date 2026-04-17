ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS assistent_min_waarde_verlopen NUMERIC DEFAULT 5,
  ADD COLUMN IF NOT EXISTS assistent_min_waarde_overschot NUMERIC DEFAULT 10,
  ADD COLUMN IF NOT EXISTS haccp_freeze_tijd TIME DEFAULT '03:00:00',
  ADD COLUMN IF NOT EXISTS standaard_tijden_per_type JSONB DEFAULT '{"opening":"07:00","tussentijds":"13:00","sluiting":"22:00","schoonmaak":"09:00","haccp":"10:00"}'::jsonb;