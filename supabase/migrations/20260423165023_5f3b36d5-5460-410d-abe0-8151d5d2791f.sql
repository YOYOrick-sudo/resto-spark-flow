UPDATE public.signals
SET status = 'resolved', resolved_at = now()
WHERE dedup_key = 'inkoop_factuur_blocked:a9d36264-79bc-4999-a27e-9bbb3ede19f1'
  AND status = 'active';

DELETE FROM public.factuur_regels
WHERE factuur_id = 'a9d36264-79bc-4999-a27e-9bbb3ede19f1';

UPDATE public.factuur_uploads
SET status = 'verwerken',
    ai_parsing_status = NULL,
    validation_status = NULL,
    validation_blocked_reason = NULL,
    validation_errors = NULL,
    validation_warnings = NULL,
    validation_retries = 0,
    ai_parsed_at = NULL,
    ai_raw_response = NULL,
    verwerkt_op = NULL
WHERE id = 'a9d36264-79bc-4999-a27e-9bbb3ede19f1';