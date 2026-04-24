CREATE OR REPLACE VIEW public.goods_receipts_chef_inbox
WITH (security_invoker = true) AS
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
  gr.totaal_regels_verwacht,
  gr.totaal_regels_akkoord,
  gr.totaal_regels_afwijking,
  gr.created_at,
  gr.updated_at,
  lev.naam AS leverancier_naam,
  (SELECT COUNT(*) FROM public.goods_receipt_lines grl WHERE grl.goods_receipt_id = gr.id) AS regels_count,
  EXISTS(
    SELECT 1 FROM public.goods_receipt_lines grl
    JOIN public.ingredienten i ON i.id = grl.ingredient_id
    WHERE grl.goods_receipt_id = gr.id AND i.haccp_categorie = 'gekoeld'
  ) AS has_gekoeld,
  EXISTS(
    SELECT 1 FROM public.goods_receipt_lines grl
    JOIN public.ingredienten i ON i.id = grl.ingredient_id
    WHERE grl.goods_receipt_id = gr.id AND i.haccp_categorie = 'vries'
  ) AS has_vries,
  EXISTS(
    SELECT 1 FROM public.goods_receipt_lines grl
    JOIN public.ingredienten i ON i.id = grl.ingredient_id
    WHERE grl.goods_receipt_id = gr.id
      AND (i.haccp_strict_temp_max IS NOT NULL OR i.haccp_categorie = 'vis_op_ijs')
  ) AS has_risicogroep
FROM public.goods_receipts gr
LEFT JOIN public.leveranciers lev ON lev.id = gr.leverancier_id
WHERE gr.ontvangst_status = 'verwachten'
  AND gr.ai_parse_status = 'success';

COMMENT ON VIEW public.goods_receipts_chef_inbox IS
  'Pakbonnen klaar voor chef-bevestiging (ai_parse_status=success, ontvangst_status=verwachten). security_invoker=true erft RLS van goods_receipts.';

GRANT SELECT ON public.goods_receipts_chef_inbox TO authenticated;