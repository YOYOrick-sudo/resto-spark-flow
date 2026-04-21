UPDATE factuur_uploads SET 
  ai_parsing_status = 'failed',
  ai_raw_response = COALESCE(ai_raw_response, '{}'::jsonb) || 
    jsonb_build_object('error', 'manual_cleanup_pre_step2_final')
WHERE bestandsnaam ILIKE '%24062025%' 
  AND ai_parsing_status = 'processing';