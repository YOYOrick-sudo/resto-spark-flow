
CREATE TABLE public.marketing_popup_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT false,

  exit_intent_enabled BOOLEAN NOT NULL DEFAULT false,

  timed_popup_enabled BOOLEAN NOT NULL DEFAULT false,
  timed_popup_delay_seconds INTEGER NOT NULL DEFAULT 15,

  sticky_bar_enabled BOOLEAN NOT NULL DEFAULT false,
  sticky_bar_position TEXT NOT NULL DEFAULT 'bottom',

  headline TEXT NOT NULL DEFAULT 'Mis geen enkele actie!',
  description TEXT NOT NULL DEFAULT 'Schrijf je in voor onze nieuwsbrief en ontvang exclusieve aanbiedingen.',
  button_text TEXT NOT NULL DEFAULT 'Aanmelden',
  success_message TEXT NOT NULL DEFAULT 'Bedankt voor je inschrijving!',
  gdpr_text TEXT NOT NULL DEFAULT 'Door je aan te melden ga je akkoord met onze privacy policy.',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT marketing_popup_config_location_unique UNIQUE (location_id)
);

ALTER TABLE public.marketing_popup_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY popup_config_select ON public.marketing_popup_config
  FOR SELECT USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY popup_config_insert ON public.marketing_popup_config
  FOR INSERT WITH CHECK (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY popup_config_update ON public.marketing_popup_config
  FOR UPDATE USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
