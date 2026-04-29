ALTER TABLE public.goods_receipt_lines
  ADD COLUMN IF NOT EXISTS ai_package_label text;

ALTER TABLE public.leveranciers_artikelen
  ADD COLUMN IF NOT EXISTS verpakking_label text;