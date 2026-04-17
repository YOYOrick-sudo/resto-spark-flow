-- 1. preview_snapshot kolom voor goedkeuring-impact
ALTER TABLE public.factuur_uploads
ADD COLUMN IF NOT EXISTS preview_snapshot JSONB;

-- 2. Voeg 'inkoop' toe aan module_key enum
ALTER TYPE public.module_key ADD VALUE IF NOT EXISTS 'inkoop';