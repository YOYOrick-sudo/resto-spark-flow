
-- Create cross-module communication_settings table
CREATE TABLE public.communication_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id uuid NOT NULL UNIQUE REFERENCES public.locations(id),
  sender_name text,
  reply_to text,
  footer_text text,
  brand_color text DEFAULT '#1d979e',
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.communication_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as onboarding_settings)
CREATE POLICY "communication_settings_manage"
  ON public.communication_settings FOR ALL
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

CREATE POLICY "communication_settings_select_location"
  ON public.communication_settings FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));

CREATE POLICY "communication_settings_select_platform"
  ON public.communication_settings FOR SELECT
  USING (is_platform_user(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_communication_settings_updated_at
  BEFORE UPDATE ON public.communication_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing data from onboarding_settings.email_config
INSERT INTO public.communication_settings (location_id, sender_name, reply_to)
SELECT
  os.location_id,
  NULLIF(TRIM((os.email_config->>'sender_name')::text), ''),
  NULLIF(TRIM((os.email_config->>'reply_to')::text), '')
FROM public.onboarding_settings os
WHERE os.email_config IS NOT NULL
  AND (
    NULLIF(TRIM((os.email_config->>'sender_name')::text), '') IS NOT NULL
    OR NULLIF(TRIM((os.email_config->>'reply_to')::text), '') IS NOT NULL
  )
ON CONFLICT (location_id) DO NOTHING;
