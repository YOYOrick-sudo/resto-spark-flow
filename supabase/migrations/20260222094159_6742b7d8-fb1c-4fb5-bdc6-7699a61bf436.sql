
-- Create unique constraint for campaign analytics upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_analytics_unique 
  ON public.marketing_campaign_analytics (campaign_id, channel);

-- RPC to atomically increment analytics counters
CREATE OR REPLACE FUNCTION public.increment_marketing_analytics(
  p_campaign_id uuid,
  p_location_id uuid,
  p_field text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure analytics row exists
  INSERT INTO marketing_campaign_analytics (campaign_id, location_id, channel)
  VALUES (p_campaign_id, p_location_id, 'email')
  ON CONFLICT (campaign_id, channel) DO NOTHING;

  -- Increment the specified field
  EXECUTE format(
    'UPDATE marketing_campaign_analytics SET %I = %I + 1, updated_at = now() WHERE campaign_id = $1 AND channel = ''email''',
    p_field, p_field
  ) USING p_campaign_id;
END;
$$;
