
ALTER TABLE public.goods_receipt_lines
  ADD COLUMN IF NOT EXISTS suggested_ingredient_id uuid
  REFERENCES public.ingredienten(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_goods_receipt_lines_suggested_ingredient
  ON public.goods_receipt_lines(suggested_ingredient_id)
  WHERE suggested_ingredient_id IS NOT NULL;

COMMENT ON COLUMN public.goods_receipt_lines.suggested_ingredient_id IS
  'Twijfelzone-vangnet (fuzzy 0.50-0.70): AI-suggestie wachtend op kok-bevestiging. Bij match_status=needs_confirmation is dit de voorgestelde ingredient_id.';
