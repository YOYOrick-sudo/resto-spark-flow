
-- Create a function to publish scheduled posts
CREATE OR REPLACE FUNCTION public.publish_scheduled_social_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _post RECORD;
  _url TEXT;
  _key TEXT;
BEGIN
  _url := current_setting('app.settings.supabase_url', true);
  _key := current_setting('app.settings.service_role_key', true);
  
  IF _url IS NULL OR _key IS NULL THEN
    RETURN;
  END IF;

  FOR _post IN
    SELECT id FROM public.marketing_social_posts
    WHERE status = 'scheduled'
      AND scheduled_at <= now()
  LOOP
    PERFORM net.http_post(
      url := _url || '/functions/v1/marketing-publish-social',
      body := json_build_object('post_id', _post.id)::jsonb,
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _key
      )::jsonb
    );
  END LOOP;
END;
$fn$;

-- Schedule the cron job
SELECT cron.schedule(
  'marketing-publish-scheduled',
  '*/5 * * * *',
  'SELECT public.publish_scheduled_social_posts()'
);
