UPDATE leveranciers
SET email_domains = ARRAY['shouf.ai']::text[]
WHERE id = '42fa6ece-6922-42a2-a6c4-ce25b8a77595';

UPDATE leveranciers
SET email_domains = ARRAY[]::text[]
WHERE id = '79afef0e-2d82-4786-a4a2-67c584ca17b5';