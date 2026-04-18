-- 1. Verwijder de testfunctie
DROP FUNCTION IF EXISTS public.__test_bestelmethode_security__(uuid, uuid, uuid, uuid);

-- 2. Verwijder de 6 audit-log entries die door de tests zijn aangemaakt
--    (specifieke timestamps + entity_id van de test-bestelling)
DELETE FROM public.audit_log
WHERE entity_type = 'bestelling'
  AND action = 'bestelmethode_changed'
  AND entity_id IN ('c8074702-e323-4418-ae55-a5ffc68d63ec'::uuid)
  AND created_at >= '2026-04-18 21:19:00+00'
  AND created_at <= '2026-04-18 21:21:00+00';