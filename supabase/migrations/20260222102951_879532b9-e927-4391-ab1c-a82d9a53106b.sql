
-- =============================================
-- Sessie 2.1: Social Database Tables
-- =============================================

-- Table: marketing_social_accounts
CREATE TABLE public.marketing_social_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  page_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, platform)
);

-- Table: marketing_social_posts
CREATE TABLE public.marketing_social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'feed',
  content_text TEXT,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  external_post_id TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule JSONB,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  alternative_caption TEXT,
  content_type_tag TEXT,
  analytics JSONB NOT NULL DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_social_accounts_location ON public.marketing_social_accounts(location_id);
CREATE INDEX idx_social_posts_location ON public.marketing_social_posts(location_id);
CREATE INDEX idx_social_posts_status ON public.marketing_social_posts(status);
CREATE INDEX idx_social_posts_scheduled ON public.marketing_social_posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_social_posts_platform ON public.marketing_social_posts(platform);

-- RLS: marketing_social_accounts
ALTER TABLE public.marketing_social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_accounts_select"
  ON public.marketing_social_accounts FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));

CREATE POLICY "social_accounts_insert"
  ON public.marketing_social_accounts FOR INSERT
  WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY "social_accounts_update"
  ON public.marketing_social_accounts FOR UPDATE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY "social_accounts_delete"
  ON public.marketing_social_accounts FOR DELETE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

-- RLS: marketing_social_posts
ALTER TABLE public.marketing_social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_posts_select"
  ON public.marketing_social_posts FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));

CREATE POLICY "social_posts_insert"
  ON public.marketing_social_posts FOR INSERT
  WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY "social_posts_update"
  ON public.marketing_social_posts FOR UPDATE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY "social_posts_delete"
  ON public.marketing_social_posts FOR DELETE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

-- Updated_at trigger for social_accounts
CREATE TRIGGER update_social_accounts_updated_at
  BEFORE UPDATE ON public.marketing_social_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
