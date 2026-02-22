
ALTER TABLE public.marketing_social_posts
  ADD COLUMN IF NOT EXISTS error_message TEXT;
