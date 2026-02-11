
-- Add new columns to onboarding_phases for phase ownership and assistant config
ALTER TABLE public.onboarding_phases ADD COLUMN is_custom boolean NOT NULL DEFAULT false;
ALTER TABLE public.onboarding_phases ADD COLUMN phase_owner_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.onboarding_phases ADD COLUMN phase_owner_name text;
ALTER TABLE public.onboarding_phases ADD COLUMN phase_owner_email text;
ALTER TABLE public.onboarding_phases ADD COLUMN assistant_enabled boolean NOT NULL DEFAULT false;
