ALTER TABLE public.factuur_uploads ADD COLUMN IF NOT EXISTS file_hash text;
CREATE INDEX IF NOT EXISTS idx_factuur_uploads_loc_hash
  ON public.factuur_uploads (location_id, file_hash)
  WHERE file_hash IS NOT NULL;