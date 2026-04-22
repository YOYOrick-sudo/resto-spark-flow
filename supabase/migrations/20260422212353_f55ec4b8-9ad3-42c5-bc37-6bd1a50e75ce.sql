ALTER TABLE public.factuur_uploads 
ADD COLUMN IF NOT EXISTS v2_shadow_duration_ms INTEGER;