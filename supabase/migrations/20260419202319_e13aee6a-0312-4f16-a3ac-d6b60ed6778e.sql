-- ============================================================
-- R4b-3: Multi-leverancier support voor ingrediënten
-- ============================================================

-- ------------------------------------------------------------
-- 1) Trigger-functie: auto-recalc kostprijs als MIN(actief)
-- ------------------------------------------------------------
-- Strategie:
--   - Pakt de laagste prijs_per_eenheid uit alle is_actief=true rijen
--     voor het betreffende ingredient_id.
--   - Schrijft alleen wanneer kostprijs_bron NULL is, of niet 'handmatig'.
--     Handmatig overschreven prijzen worden RESPECTEERD.
--   - Markeert bron als 'multi_leverancier' wanneer er ≥2 actieve
--     leveranciers zijn, anders 'factuur'.
--   - Werkt op INSERT (nieuw artikel), UPDATE (prijs-/is_actief-change)
--     en DELETE (artikel verdwijnt).

CREATE OR REPLACE FUNCTION public.recalc_ingredient_kostprijs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ingredient_id uuid;
  v_min_prijs numeric;
  v_actief_count int;
  v_huidige_bron text;
BEGIN
  -- Bepaal welk ingredient_id geraakt is
  IF TG_OP = 'DELETE' THEN
    v_ingredient_id := OLD.ingredient_id;
  ELSE
    v_ingredient_id := NEW.ingredient_id;
  END IF;

  IF v_ingredient_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Lees huidige bron — handmatige override mag NIET overschreven worden
  SELECT kostprijs_bron INTO v_huidige_bron
    FROM public.ingredienten
    WHERE id = v_ingredient_id;

  IF v_huidige_bron = 'handmatig' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Bereken min(prijs_per_eenheid) over alle actieve rijen
  SELECT
    MIN(prijs_per_eenheid),
    COUNT(*)
  INTO v_min_prijs, v_actief_count
  FROM public.leveranciers_artikelen
  WHERE ingredient_id = v_ingredient_id
    AND is_actief = true
    AND prijs_per_eenheid IS NOT NULL;

  -- Schrijf nieuwe kostprijs
  UPDATE public.ingredienten
     SET kostprijs = v_min_prijs,
         kostprijs_bron = CASE
           WHEN v_min_prijs IS NULL THEN kostprijs_bron
           WHEN v_actief_count >= 2 THEN 'multi_leverancier'
           ELSE 'factuur'
         END,
         kostprijs_laatst_bijgewerkt = CASE
           WHEN v_min_prijs IS NULL THEN kostprijs_laatst_bijgewerkt
           ELSE now()
         END
   WHERE id = v_ingredient_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger
DROP TRIGGER IF EXISTS trg_recalc_ingredient_kostprijs ON public.leveranciers_artikelen;
CREATE TRIGGER trg_recalc_ingredient_kostprijs
AFTER INSERT OR UPDATE OF prijs_per_eenheid, is_actief, ingredient_id OR DELETE
ON public.leveranciers_artikelen
FOR EACH ROW
EXECUTE FUNCTION public.recalc_ingredient_kostprijs();

-- ------------------------------------------------------------
-- 2) RPC: koppel_extra_leverancier
-- ------------------------------------------------------------
-- Koppelt een nieuwe leveranciers_artikelen rij aan een BESTAAND ingredient
-- ZONDER bestaande actieve koppelingen te deactiveren. Beide blijven actief.
-- De trigger hierboven recalculeert daarna automatisch de kostprijs.

CREATE OR REPLACE FUNCTION public.koppel_extra_leverancier(
  p_ingredient_id uuid,
  p_leverancier_id uuid,
  p_artikel_naam text,
  p_artikel_nummer text DEFAULT NULL,
  p_ean_code text DEFAULT NULL,
  p_verpakking_hoeveelheid numeric DEFAULT NULL,
  p_verpakking_eenheid text DEFAULT NULL,
  p_prijs_per_verpakking numeric DEFAULT NULL,
  p_prijs_per_eenheid numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_artikel_id uuid;
  v_location_id uuid;
BEGIN
  -- Veiligheidscheck: bestaat ingredient en heeft caller toegang?
  SELECT location_id INTO v_location_id
    FROM public.ingredienten
    WHERE id = p_ingredient_id;

  IF v_location_id IS NULL THEN
    RAISE EXCEPTION 'Ingrediënt niet gevonden';
  END IF;

  IF NOT public.user_has_location_access(v_location_id) THEN
    RAISE EXCEPTION 'Geen toegang tot deze locatie';
  END IF;

  -- INSERT of UPDATE op (leverancier_id, artikel_nummer) wanneer artikelnummer gegeven.
  -- Wanneer geen artikelnummer: simpele INSERT (kan dan duplicaat-rij geven, dat is OK
  -- voor "alleen prijs" koppelingen zonder artikelnummer-identificatie).
  IF p_artikel_nummer IS NOT NULL AND length(trim(p_artikel_nummer)) > 0 THEN
    INSERT INTO public.leveranciers_artikelen (
      leverancier_id, ingredient_id, artikel_naam, artikel_nummer, ean_code,
      verpakking_hoeveelheid, verpakking_eenheid,
      prijs_per_verpakking, prijs_per_eenheid,
      is_actief, laatst_gesynchroniseerd
    ) VALUES (
      p_leverancier_id, p_ingredient_id, p_artikel_naam, trim(p_artikel_nummer), p_ean_code,
      p_verpakking_hoeveelheid, p_verpakking_eenheid,
      p_prijs_per_verpakking, p_prijs_per_eenheid,
      true, now()
    )
    ON CONFLICT (leverancier_id, artikel_nummer) DO UPDATE SET
      ingredient_id = EXCLUDED.ingredient_id,
      artikel_naam = EXCLUDED.artikel_naam,
      ean_code = COALESCE(EXCLUDED.ean_code, leveranciers_artikelen.ean_code),
      verpakking_hoeveelheid = EXCLUDED.verpakking_hoeveelheid,
      verpakking_eenheid = EXCLUDED.verpakking_eenheid,
      prijs_per_verpakking = EXCLUDED.prijs_per_verpakking,
      prijs_per_eenheid = EXCLUDED.prijs_per_eenheid,
      is_actief = true,
      laatst_gesynchroniseerd = now()
    RETURNING id INTO v_artikel_id;
  ELSE
    INSERT INTO public.leveranciers_artikelen (
      leverancier_id, ingredient_id, artikel_naam, ean_code,
      verpakking_hoeveelheid, verpakking_eenheid,
      prijs_per_verpakking, prijs_per_eenheid,
      is_actief, laatst_gesynchroniseerd
    ) VALUES (
      p_leverancier_id, p_ingredient_id, p_artikel_naam, p_ean_code,
      p_verpakking_hoeveelheid, p_verpakking_eenheid,
      p_prijs_per_verpakking, p_prijs_per_eenheid,
      true, now()
    )
    RETURNING id INTO v_artikel_id;
  END IF;

  RETURN v_artikel_id;
END;
$$;

-- Toegang
REVOKE ALL ON FUNCTION public.koppel_extra_leverancier(uuid,uuid,text,text,text,numeric,text,numeric,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.koppel_extra_leverancier(uuid,uuid,text,text,text,numeric,text,numeric,numeric) TO authenticated;