
-- Mark test goods_receipt + intake — no inventory side-effects (chef heeft niet bevestigd)
UPDATE goods_receipts
SET ontvangst_status = 'geannuleerd',
    notities = COALESCE(notities, '') || ' [TEST - instroomtest 29 mei 2026 - genegeerd]'
WHERE id = '87d32388-cecd-499e-92f5-9737a6c9d604';

UPDATE pakbon_email_intake
SET ai_parse_status = 'rejected_duplicate',
    error_reason = '[TEST - instroomtest 29 mei 2026 - genegeerd]'
WHERE id = '616b691b-e6bc-4f02-8b83-5eaa4df842be';
