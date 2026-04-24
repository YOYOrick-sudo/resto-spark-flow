ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS pakbon_klacht_email text,
  ADD COLUMN IF NOT EXISTS pakbon_klacht_cc text[] NOT NULL DEFAULT ARRAY[]::text[];

COMMENT ON COLUMN public.locations.pakbon_klacht_email IS
  'Hoofdadres voor klachtmails over ontvangen pakbonnen (V1: locatie-breed; later per leverancier override). Null = klacht-mail uitgeschakeld.';
COMMENT ON COLUMN public.locations.pakbon_klacht_cc IS
  'Optionele CC-adressen voor klachtmails over pakbonnen.';