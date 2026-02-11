
-- Create onboarding_messages table
CREATE TABLE public.onboarding_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.onboarding_candidates(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.locations(id),
  direction text NOT NULL DEFAULT 'outbound',
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  resend_message_id text,
  triggered_by text NOT NULL DEFAULT 'user',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as other onboarding tables)
CREATE POLICY "onboarding_messages_select_location"
  ON public.onboarding_messages FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));

CREATE POLICY "onboarding_messages_select_platform"
  ON public.onboarding_messages FOR SELECT
  USING (is_platform_user(auth.uid()));

CREATE POLICY "onboarding_messages_insert"
  ON public.onboarding_messages FOR INSERT
  WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

CREATE POLICY "onboarding_messages_update"
  ON public.onboarding_messages FOR UPDATE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

CREATE POLICY "onboarding_messages_delete"
  ON public.onboarding_messages FOR DELETE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

-- Index for fast lookups
CREATE INDEX idx_onboarding_messages_candidate ON public.onboarding_messages(candidate_id, created_at);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.onboarding_messages;
