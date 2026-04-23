-- Sprint Multi-BTW + Emballage — Stop-gate 2 reset (poging 2 met juiste status enum)
DELETE FROM public.factuur_regels
WHERE factuur_id = 'a9d36264-79bc-4999-a27e-9bbb3ede19f1';

UPDATE public.factuur_uploads
SET status = 'verwerken',
    ai_parsing_status = 'pending',
    ai_raw_response = NULL,
    ai_parsed_at = NULL,
    ai_tokens_input = NULL,
    ai_tokens_output = NULL,
    ai_cost_estimate = NULL,
    ai_confidence_overall = NULL,
    parse_confidence = NULL,
    validation_status = NULL,
    validation_blocked_reason = NULL,
    validation_warnings = NULL,
    validation_errors = NULL,
    validation_retries = 0,
    subtotaal_excl_btw = NULL,
    btw_bedrag = NULL,
    totaal_incl_btw = NULL,
    totaalbedrag = NULL,
    factuurnummer = NULL,
    factuurdatum = NULL,
    leverancier_naam_herkend = NULL,
    leverancier_id = NULL,
    preview_snapshot = NULL,
    fuzzy_kandidaten = '[]'::jsonb,
    verwerkt_op = NULL,
    updated_at = now()
WHERE id = 'a9d36264-79bc-4999-a27e-9bbb3ede19f1';