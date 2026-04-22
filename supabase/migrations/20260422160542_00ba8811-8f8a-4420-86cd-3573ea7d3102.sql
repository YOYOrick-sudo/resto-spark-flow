ALTER TABLE public.factuur_uploads
  ADD COLUMN IF NOT EXISTS v2_shadow_response jsonb,
  ADD COLUMN IF NOT EXISTS v2_shadow_validation_status text,
  ADD COLUMN IF NOT EXISTS v2_shadow_tokens_input integer,
  ADD COLUMN IF NOT EXISTS v2_shadow_tokens_output integer,
  ADD COLUMN IF NOT EXISTS v2_shadow_cost_eur numeric,
  ADD COLUMN IF NOT EXISTS v2_shadow_parse_method text,
  ADD COLUMN IF NOT EXISTS v2_shadow_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS v2_shadow_error text;

COMMENT ON COLUMN public.factuur_uploads.v2_shadow_response IS 'Sprint Factuur-AI V2 shadow output (parallel-mode). V1 schrijft hier niet in.';
COMMENT ON COLUMN public.factuur_uploads.v2_shadow_validation_status IS 'V2 validator uitkomst: valid | warning | invalid.';