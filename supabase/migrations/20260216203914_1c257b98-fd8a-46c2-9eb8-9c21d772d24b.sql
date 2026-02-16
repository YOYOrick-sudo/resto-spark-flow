
-- Drop the index first, then move extension, then recreate
DROP INDEX IF EXISTS public.idx_customers_name_trgm;
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

CREATE INDEX idx_customers_name_trgm
  ON public.customers
  USING gin ((first_name || ' ' || last_name) extensions.gin_trgm_ops);
