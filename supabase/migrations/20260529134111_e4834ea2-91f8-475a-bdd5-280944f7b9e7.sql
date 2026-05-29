UPDATE public.ingredienten SET voorraad = 60   WHERE id = '53606991-8b08-421d-b861-4583efe132d8';
UPDATE public.ingredienten SET voorraad = 400  WHERE id = '602141e5-acef-42c0-a1f1-bfc5f0eef736';
UPDATE public.ingredienten SET voorraad = 150  WHERE id = 'bb3beea7-b609-4c5a-ba9f-3f115a736f86';
UPDATE public.waste_registraties
SET reden = '[TEST - genegeerd] ' || COALESCE(reden, '')
WHERE reden LIKE 'TEST-WASTE-%';