-- 1. Nieuwe kolommen
ALTER TABLE public.pakbon_email_intake
  ADD COLUMN IF NOT EXISTS sender_match_leverancier_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.goods_receipts
  ADD COLUMN IF NOT EXISTS leverancier_warning boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS leverancier_warning_reason text;

COMMENT ON COLUMN public.pakbon_email_intake.sender_match_leverancier_ids IS
  'Alle leverancier-ids die matchen op het afzender-domein van deze email. Lege array = geen match.';
COMMENT ON COLUMN public.goods_receipts.leverancier_warning IS
  'TRUE wanneer de gekozen leverancier mogelijk niet correct is (sender vs PDF mismatch).';
COMMENT ON COLUMN public.goods_receipts.leverancier_warning_reason IS
  'Mens-leesbare uitleg waarom er twijfel bestaat over de leverancier-toewijzing.';

-- 2. Cleanup van huidige test-pakbon (Boer & Chef PDF was foutief gekoppeld aan Bidfood)
UPDATE public.goods_receipts
SET leverancier_id = (
  SELECT id FROM public.leveranciers
  WHERE naam = 'Boer & Chef B.V.'
    AND location_id = 'cf4b94fa-9ac9-4779-81d9-7411a63c90b2'
  LIMIT 1
)
WHERE id = '6f1914d6-90d0-4633-b0f1-032381326e69';

-- 3. View aanvullen met warning-velden
DROP VIEW IF EXISTS public.goods_receipts_chef_inbox;

CREATE VIEW public.goods_receipts_chef_inbox AS
SELECT
  gr.id,
  gr.location_id,
  gr.organization_id,
  gr.leverancier_id,
  gr.bestelling_id,
  gr.pakbon_nummer,
  gr.levering_datum,
  gr.ontvangst_status,
  gr.ai_parse_status,
  gr.ai_parse_confidence,
  gr.ai_generated,
  gr.notities,
  gr.leverancier_warning,
  gr.leverancier_warning_reason,
  gr.totaal_regels_verwacht,
  gr.totaal_regels_akkoord,
  gr.totaal_regels_afwijking,
  gr.created_at,
  gr.updated_at,
  lev.naam AS leverancier_naam,
  (SELECT count(*) FROM public.goods_receipt_lines grl
    WHERE grl.goods_receipt_id = gr.id) AS regels_count,
  EXISTS (
    SELECT 1 FROM public.goods_receipt_lines grl
    JOIN public.ingredienten i ON i.id = grl.ingredient_id
    WHERE grl.goods_receipt_id = gr.id AND i.haccp_categorie = 'gekoeld'::haccp_categorie
  ) AS has_gekoeld,
  EXISTS (
    SELECT 1 FROM public.goods_receipt_lines grl
    JOIN public.ingredienten i ON i.id = grl.ingredient_id
    WHERE grl.goods_receipt_id = gr.id AND i.haccp_categorie = 'vries'::haccp_categorie
  ) AS has_vries,
  EXISTS (
    SELECT 1 FROM public.goods_receipt_lines grl
    JOIN public.ingredienten i ON i.id = grl.ingredient_id
    WHERE grl.goods_receipt_id = gr.id
      AND (i.haccp_strict_temp_max IS NOT NULL OR i.haccp_categorie = 'vis_op_ijs'::haccp_categorie)
  ) AS has_risicogroep
FROM public.goods_receipts gr
LEFT JOIN public.leveranciers lev ON lev.id = gr.leverancier_id
WHERE gr.ontvangst_status = 'verwachten'::goods_receipt_status
  AND gr.ai_parse_status = 'success'::pakbon_ai_parse_status;