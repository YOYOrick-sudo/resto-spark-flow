ALTER TABLE public.marketing_social_posts
  ADD COLUMN IF NOT EXISTS ai_original_caption TEXT,
  ADD COLUMN IF NOT EXISTS operator_edited BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ab_test_group TEXT,
  ADD COLUMN IF NOT EXISTS ab_test_id UUID;