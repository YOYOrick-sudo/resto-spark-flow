-- Fix 1: leveranciers_artikelen — vervang partial unique index door echte UNIQUE constraint
-- zodat PostgREST .upsert(onConflict: "leverancier_id,artikel_nummer") werkt.
DROP INDEX IF EXISTS public.leveranciers_artikelen_lev_artnr_unique;

ALTER TABLE public.leveranciers_artikelen
  ADD CONSTRAINT leveranciers_artikelen_lev_artnr_key
  UNIQUE (leverancier_id, artikel_nummer);

-- Fix 2: leveranciers_artikelen — afnamelijst-import gebruikt onConflict (leverancier_id, ingredient_id)
-- maar er was nooit een constraint of index voor. Voeg toe zodat die upsert ook werkt.
-- Eerst eventuele duplicaten dedupliceren (oudste rij per combo behouden).
DELETE FROM public.leveranciers_artikelen a
USING public.leveranciers_artikelen b
WHERE a.leverancier_id = b.leverancier_id
  AND a.ingredient_id = b.ingredient_id
  AND a.created_at > b.created_at
  AND a.id <> b.id;

ALTER TABLE public.leveranciers_artikelen
  ADD CONSTRAINT leveranciers_artikelen_lev_ing_key
  UNIQUE (leverancier_id, ingredient_id);