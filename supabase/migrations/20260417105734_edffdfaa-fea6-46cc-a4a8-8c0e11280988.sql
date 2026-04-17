-- 1. Deactiveer + reset verpakking-data van de 9 corrupte rijen (Kooyman, batch 10:51)
UPDATE public.leveranciers_artikelen
SET is_actief = false,
    verpakking_hoeveelheid = NULL,
    verpakking_eenheid = NULL,
    laatst_gesynchroniseerd = NULL
WHERE leverancier_id = '5bcab774-4a0c-4f93-a4dd-f93d1eb2a69b'
  AND laatst_gesynchroniseerd >= '2026-04-17 10:50:00+00'
  AND laatst_gesynchroniseerd <= '2026-04-17 10:52:00+00';

-- 2. Verwijder ALLE Kooyman factuur-uploads (cascade verwijdert factuur_regels)
DELETE FROM public.factuur_uploads
WHERE leverancier_id = '5bcab774-4a0c-4f93-a4dd-f93d1eb2a69b';