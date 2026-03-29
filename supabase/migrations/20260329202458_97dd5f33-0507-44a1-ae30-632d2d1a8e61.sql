
-- 1. Create reservation_email_templates table
CREATE TABLE public.reservation_email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, template_key)
);

ALTER TABLE public.reservation_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own location templates"
  ON public.reservation_email_templates FOR SELECT
  TO authenticated
  USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "Managers can manage templates"
  ON public.reservation_email_templates FOR ALL
  TO authenticated
  USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]))
  WITH CHECK (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

-- 2. Add reminder/reconfirm columns to reservations
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_3h_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconfirm_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconfirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconfirm_token TEXT;

-- 3. Add reminder/reconfirm settings to reservation_settings
ALTER TABLE public.reservation_settings
  ADD COLUMN IF NOT EXISTS reminder_24h_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_3h_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reconfirm_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reconfirm_min_risk_score INTEGER NOT NULL DEFAULT 60;
