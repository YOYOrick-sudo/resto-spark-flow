
-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Cron job: clone recurring posts daily at 00:00 UTC
SELECT cron.schedule(
  'marketing-clone-recurring',
  '0 0 * * *',
  $$
  INSERT INTO public.marketing_social_posts (
    location_id, platform, post_type, content_text, hashtags, media_urls,
    status, scheduled_at, is_recurring, content_type_tag, alternative_caption
  )
  SELECT
    location_id, platform, post_type, content_text, hashtags, media_urls,
    'scheduled',
    (CURRENT_DATE + INTERVAL '1 day' + COALESCE(
      (recurrence_rule->>'time')::time,
      '12:00:00'::time
    ))::timestamptz,
    false,
    content_type_tag,
    alternative_caption
  FROM public.marketing_social_posts
  WHERE is_recurring = true
    AND status IN ('published', 'scheduled')
    AND recurrence_rule IS NOT NULL
    AND (
      (recurrence_rule->>'frequency' = 'daily')
      OR (
        recurrence_rule->>'frequency' = 'weekly'
        AND EXTRACT(DOW FROM CURRENT_DATE + INTERVAL '1 day') = (recurrence_rule->>'day')::int
      )
      OR (
        recurrence_rule->>'frequency' = 'monthly'
        AND EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '1 day') = 1
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.marketing_social_posts AS existing
      WHERE existing.location_id = marketing_social_posts.location_id
        AND existing.platform = marketing_social_posts.platform
        AND existing.content_text = marketing_social_posts.content_text
        AND existing.scheduled_at::date = (CURRENT_DATE + INTERVAL '1 day')::date
        AND existing.is_recurring = false
    )
  $$
);
