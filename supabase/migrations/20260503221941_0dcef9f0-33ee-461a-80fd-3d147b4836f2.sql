ALTER TABLE public.halffabricaat_methodes
ADD COLUMN output_gewicht_per_stuk_g NUMERIC NULL
CHECK (output_gewicht_per_stuk_g IS NULL OR output_gewicht_per_stuk_g > 0);