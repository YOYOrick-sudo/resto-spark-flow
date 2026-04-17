ALTER TABLE public.checklist_templates
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;