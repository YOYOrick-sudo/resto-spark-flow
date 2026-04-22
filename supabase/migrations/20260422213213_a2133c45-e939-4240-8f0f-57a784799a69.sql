ALTER TABLE public.factuur_uploads
  ADD CONSTRAINT v2_shadow_validation_status_check
  CHECK (
    v2_shadow_validation_status IS NULL
    OR v2_shadow_validation_status IN ('processing', 'valid', 'warning', 'invalid')
  );