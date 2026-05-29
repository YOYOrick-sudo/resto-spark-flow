-- Etappe 5 tekst-verificatie: test-pakbon met needs_confirmation + ai_parse_confidence
INSERT INTO goods_receipts (
  id, location_id, organization_id, leverancier_id,
  pakbon_nummer, levering_datum, ontvangst_status,
  ai_parse_status, ai_parse_confidence,
  totaal_regels_verwacht, totaal_regels_akkoord, totaal_regels_afwijking,
  temp_gekoeld_gemeten, temp_vries_gemeten, heeft_strict_temp_alarm
)
SELECT
  'cccc3333-e606-4e60-8000-000000000006'::uuid,
  (SELECT id FROM locations WHERE name = 'Restaurant De Proeverij' LIMIT 1),
  (SELECT organization_id FROM locations WHERE name = 'Restaurant De Proeverij' LIMIT 1),
  (SELECT id FROM leveranciers WHERE naam = 'Boer & Chef' LIMIT 1),
  '[TEST]-E5-TEKSTEN',
  CURRENT_DATE,
  'verwachten',
  'success',
  0.95,
  2, 0, 0,
  null, null, false;

-- Regel 1: Peer conference — needs_confirmation (triggert banner)
INSERT INTO goods_receipt_lines (
  id, goods_receipt_id,
  product_naam_herkend, ai_raw_naam,
  ai_per_package_quantity, ai_package_unit, ai_is_weighted, ai_package_label,
  hoeveelheid_verwacht, eenheid_verwacht,
  ai_total_received_quantity, ai_total_received_unit,
  ingredient_id, is_nieuw_ingredient,
  match_confidence, match_status,
  suggested_ingredient_id,
  haccp_categorie, lotnummer, tht_datum, status
)
SELECT
  'dddd4444-e607-4e70-8000-000000000001'::uuid,
  'cccc3333-e606-4e60-8000-000000000006'::uuid,
  'Peer conference', 'Peer conference Holland',
  5.0, 'kg', true, 'doos',
  1, 'kg',
  5.06, 'kg',
  (SELECT id FROM ingredienten WHERE naam = 'Peer conference' LIMIT 1),
  false,
  0.75, 'needs_confirmation',
  (SELECT id FROM ingredienten WHERE naam = 'Peer conference' LIMIT 1),
  'gekoeld', null, null, 'verwacht';

-- Regel 2: Granaatappel — MANUAL_REQUIRED (triggert "moet je nog bevestigen")
INSERT INTO goods_receipt_lines (
  id, goods_receipt_id,
  product_naam_herkend, ai_raw_naam,
  ai_per_package_quantity, ai_package_unit, ai_is_weighted, ai_package_label,
  hoeveelheid_verwacht, eenheid_verwacht,
  ai_total_received_quantity, ai_total_received_unit,
  ingredient_id, is_nieuw_ingredient,
  match_confidence, match_status,
  haccp_categorie, lotnummer, tht_datum, status
)
SELECT
  'dddd4444-e607-4e70-8000-000000000002'::uuid,
  'cccc3333-e606-4e60-8000-000000000006'::uuid,
  'Granaatappel', 'Granaatappel',
  null, null, false, null,
  4, 'stuk',
  4, 'stuk',
  (SELECT id FROM ingredienten WHERE naam = 'Granaatappel' LIMIT 1),
  false,
  0.92, 'matched',
  null, null, null, 'verwacht';
