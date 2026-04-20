WITH cleaned AS (
  UPDATE public.factuur_uploads SET
    ai_parsing_status = 'failed',
    ai_raw_response = COALESCE(ai_raw_response, '{}'::jsonb) ||
      jsonb_build_object(
        'error', 'zombie_cleanup',
        'note', 'Status was stuck on processing >15 min, marked as failed during deploy',
        'cleaned_at', now()
      )
  WHERE ai_parsing_status = 'processing'
    AND created_at < NOW() - INTERVAL '15 minutes'
  RETURNING id
)
SELECT count(*) AS zombies_cleaned FROM cleaned;