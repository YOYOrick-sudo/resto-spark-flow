-- Etappe 1A: schema-uitbreiding ingredienten voor halffabricaat-voorraad (Model 1, Optie A)
ALTER TABLE public.ingredienten
  ADD COLUMN IF NOT EXISTS is_halffabricaat boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recept_id uuid REFERENCES public.recepten(id);

CREATE INDEX IF NOT EXISTS idx_ingredienten_recept
  ON public.ingredienten(recept_id) WHERE recept_id IS NOT NULL;

-- Uniciteit: 1-op-1 halffabricaat-recept ↔ ingredient (idempotentie-anker)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ingredienten_recept
  ON public.ingredienten(recept_id) WHERE recept_id IS NOT NULL;

COMMENT ON COLUMN public.ingredienten.is_halffabricaat IS
  'True voor ingredient-records die een halffabricaat-recept representeren (Model 1, Optie A).';
COMMENT ON COLUMN public.ingredienten.recept_id IS
  'FK naar recepten waar type=halffabricaat. NULL voor normale ingredienten.';