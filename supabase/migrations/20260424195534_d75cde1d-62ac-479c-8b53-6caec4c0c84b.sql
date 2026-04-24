-- 1. Eerst voorraad-mutaties rollbacken (voor we voorraad_bewegingen verwijderen)
WITH test_movements AS (
  SELECT vb.ingredient_id, vb.hoeveelheid
  FROM voorraad_bewegingen vb
  JOIN goods_receipt_lines grl ON grl.id = vb.referentie_id
  JOIN goods_receipts gr ON gr.id = grl.goods_receipt_id
  WHERE gr.pakbon_nummer LIKE 'TEST-2C-%'
)
UPDATE ingredienten i
SET voorraad = GREATEST(0, voorraad - tm.hoeveelheid)
FROM test_movements tm
WHERE i.id = tm.ingredient_id;

-- 2. Voorraad bewegingen verwijderen
DELETE FROM voorraad_bewegingen
WHERE referentie_id IN (
  SELECT grl.id FROM goods_receipt_lines grl
  JOIN goods_receipts gr ON gr.id = grl.goods_receipt_id
  WHERE gr.pakbon_nummer LIKE 'TEST-2C-%'
);

-- 3. Credit note requests
DELETE FROM credit_note_requests
WHERE goods_receipt_id IN (
  SELECT id FROM goods_receipts WHERE pakbon_nummer LIKE 'TEST-2C-%'
);

-- 4. Goods receipt lines (cascade van receipt zou ook moeten werken, maar expliciet)
DELETE FROM goods_receipt_lines
WHERE goods_receipt_id IN (
  SELECT id FROM goods_receipts WHERE pakbon_nummer LIKE 'TEST-2C-%'
);

-- 5. Goods receipts zelf
DELETE FROM goods_receipts WHERE pakbon_nummer LIKE 'TEST-2C-%';

-- 6. Temperatuur registraties van de owner-user (alleen pakbon-ontvangst van afgelopen uur)
DELETE FROM temperatuur_registraties
WHERE gemeten_door = '9ec86890-099f-4c0e-9a4f-19dc7571beaf'
  AND locatie_naam IN ('Pakbon ontvangst (gekoeld)', 'Pakbon ontvangst (vries)')
  AND created_at > now() - interval '2 hours';

-- 7. Checklist responses + runs van de Ontvangst-template van afgelopen uur
DELETE FROM checklist_responses
WHERE run_id IN (
  SELECT id FROM checklist_runs
  WHERE template_id = '3380dd1a-1cf2-4c10-bf1b-8ad6502d7c9c'
    AND created_at > now() - interval '2 hours'
    AND opmerkingen LIKE 'Auto-aangemaakt via pakbon-bevestiging%'
);
DELETE FROM checklist_runs
WHERE template_id = '3380dd1a-1cf2-4c10-bf1b-8ad6502d7c9c'
  AND created_at > now() - interval '2 hours'
  AND opmerkingen LIKE 'Auto-aangemaakt via pakbon-bevestiging%';

-- 8. Dummy user profile (geen FK rollen meer, want verwijderd in vorige migration; safe to remove)
DELETE FROM profiles WHERE id = '00000000-0000-0000-0000-000000000099';