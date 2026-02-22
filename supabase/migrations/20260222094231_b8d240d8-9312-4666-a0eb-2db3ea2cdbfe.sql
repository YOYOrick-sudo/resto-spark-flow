
-- Function to process scheduled campaigns
CREATE OR REPLACE FUNCTION public.process_scheduled_campaigns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _campaign RECORD;
BEGIN
  FOR _campaign IN 
    SELECT id FROM marketing_campaigns 
    WHERE status = 'scheduled' AND scheduled_at <= now()
  LOOP
    -- Call the edge function via pg_net
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/marketing-send-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
      ),
      body := jsonb_build_object('campaign_id', _campaign.id)
    );
  END LOOP;
END;
$$;
