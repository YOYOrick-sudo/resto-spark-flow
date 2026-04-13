-- ============================================================
-- VOORRAAD & INKOOP DATABASE
-- ============================================================

-- 1. LEVERANCIERS
CREATE TABLE public.leveranciers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  naam VARCHAR(255) NOT NULL,
  type VARCHAR(30) CHECK (type IN ('wholesaler','lokaal','overig')),
  api_type VARCHAR(30) CHECK (api_type IN ('sligro','bidfood','hanos','metro','handmatig')),
  klantnummer VARCHAR(100),
  contactpersoon VARCHAR(255),
  email VARCHAR(255),
  telefoon VARCHAR(50),
  notities TEXT,
  is_actief BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, naam)
);

CREATE INDEX idx_leveranciers_location ON public.leveranciers(location_id);

CREATE TRIGGER update_leveranciers_updated_at
  BEFORE UPDATE ON public.leveranciers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.leveranciers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leveranciers_select" ON public.leveranciers
  FOR SELECT TO authenticated
  USING (public.user_has_location_access((SELECT auth.uid()), location_id));

CREATE POLICY "leveranciers_insert" ON public.leveranciers
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager']::public.location_role[]));

CREATE POLICY "leveranciers_update" ON public.leveranciers
  FOR UPDATE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager']::public.location_role[]));

CREATE POLICY "leveranciers_delete" ON public.leveranciers
  FOR DELETE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager']::public.location_role[]));

-- 2. LEVERANCIERS_ARTIKELEN
CREATE TABLE public.leveranciers_artikelen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leverancier_id UUID NOT NULL REFERENCES public.leveranciers(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredienten(id),
  artikel_naam VARCHAR(255) NOT NULL,
  artikel_nummer VARCHAR(100),
  ean_code VARCHAR(13),
  verpakking_hoeveelheid DECIMAL(10,2),
  verpakking_eenheid VARCHAR(20),
  prijs_per_verpakking DECIMAL(10,4),
  prijs_per_eenheid DECIMAL(10,4),
  laatst_gesynchroniseerd TIMESTAMPTZ,
  type VARCHAR(20) CHECK (type IN ('api','handmatig','email')) DEFAULT 'handmatig',
  is_actief BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leveranciers_artikelen_leverancier ON public.leveranciers_artikelen(leverancier_id);
CREATE INDEX idx_leveranciers_artikelen_ingredient ON public.leveranciers_artikelen(ingredient_id);

CREATE TRIGGER update_leveranciers_artikelen_updated_at
  BEFORE UPDATE ON public.leveranciers_artikelen
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.leveranciers_artikelen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leveranciers_artikelen_select" ON public.leveranciers_artikelen
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leveranciers l
    WHERE l.id = leveranciers_artikelen.leverancier_id
      AND public.user_has_location_access((SELECT auth.uid()), l.location_id)
  ));

CREATE POLICY "leveranciers_artikelen_insert" ON public.leveranciers_artikelen
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.leveranciers l
    WHERE l.id = leveranciers_artikelen.leverancier_id
      AND public.user_has_role_in_location((SELECT auth.uid()), l.location_id, ARRAY['owner','manager']::public.location_role[])
  ));

CREATE POLICY "leveranciers_artikelen_update" ON public.leveranciers_artikelen
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leveranciers l
    WHERE l.id = leveranciers_artikelen.leverancier_id
      AND public.user_has_role_in_location((SELECT auth.uid()), l.location_id, ARRAY['owner','manager']::public.location_role[])
  ));

CREATE POLICY "leveranciers_artikelen_delete" ON public.leveranciers_artikelen
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leveranciers l
    WHERE l.id = leveranciers_artikelen.leverancier_id
      AND public.user_has_role_in_location((SELECT auth.uid()), l.location_id, ARRAY['owner','manager']::public.location_role[])
  ));

-- 3. BESTELLINGEN
CREATE TABLE public.bestellingen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  leverancier_id UUID NOT NULL REFERENCES public.leveranciers(id),
  bestelnummer VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'concept',
  besteldatum DATE,
  verwachte_leverdatum DATE,
  ontvangstdatum DATE,
  totaal_bedrag DECIMAL(10,2),
  notities TEXT,
  aangemaakt_door UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_bestellingen()
  RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('concept','verzonden','ontvangen','geannuleerd') THEN
    RAISE EXCEPTION 'Invalid bestelling status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_bestellingen
  BEFORE INSERT OR UPDATE ON public.bestellingen
  FOR EACH ROW EXECUTE FUNCTION public.validate_bestellingen();

CREATE INDEX idx_bestellingen_location_status ON public.bestellingen(location_id, status);
CREATE INDEX idx_bestellingen_location_leverancier ON public.bestellingen(location_id, leverancier_id);

CREATE TRIGGER update_bestellingen_updated_at
  BEFORE UPDATE ON public.bestellingen
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.bestellingen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bestellingen_select" ON public.bestellingen
  FOR SELECT TO authenticated
  USING (public.user_has_location_access((SELECT auth.uid()), location_id));

CREATE POLICY "bestellingen_insert" ON public.bestellingen
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager','kitchen']::public.location_role[]));

CREATE POLICY "bestellingen_update" ON public.bestellingen
  FOR UPDATE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager','kitchen']::public.location_role[]));

CREATE POLICY "bestellingen_delete" ON public.bestellingen
  FOR DELETE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager','kitchen']::public.location_role[]));

-- 4. BESTELREGELS
CREATE TABLE public.bestelregels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bestelling_id UUID NOT NULL REFERENCES public.bestellingen(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredienten(id),
  leveranciers_artikel_id UUID REFERENCES public.leveranciers_artikelen(id),
  bestelde_hoeveelheid DECIMAL(10,2) NOT NULL,
  ontvangen_hoeveelheid DECIMAL(10,2),
  eenheid VARCHAR(20) NOT NULL,
  prijs_per_eenheid DECIMAL(10,4),
  totaal DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bestelregels_bestelling ON public.bestelregels(bestelling_id);

ALTER TABLE public.bestelregels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bestelregels_select" ON public.bestelregels
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bestellingen b
    WHERE b.id = bestelregels.bestelling_id
      AND public.user_has_location_access((SELECT auth.uid()), b.location_id)
  ));

CREATE POLICY "bestelregels_insert" ON public.bestelregels
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.bestellingen b
    WHERE b.id = bestelregels.bestelling_id
      AND public.user_has_role_in_location((SELECT auth.uid()), b.location_id, ARRAY['owner','manager','kitchen']::public.location_role[])
  ));

CREATE POLICY "bestelregels_update" ON public.bestelregels
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bestellingen b
    WHERE b.id = bestelregels.bestelling_id
      AND public.user_has_role_in_location((SELECT auth.uid()), b.location_id, ARRAY['owner','manager','kitchen']::public.location_role[])
  ));

CREATE POLICY "bestelregels_delete" ON public.bestelregels
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bestellingen b
    WHERE b.id = bestelregels.bestelling_id
      AND public.user_has_role_in_location((SELECT auth.uid()), b.location_id, ARRAY['owner','manager','kitchen']::public.location_role[])
  ));

-- 5. WASTE_REGISTRATIES
CREATE TABLE public.waste_registraties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.ingredienten(id),
  recept_id UUID REFERENCES public.recepten(id),
  omschrijving VARCHAR(255),
  hoeveelheid DECIMAL(10,2) NOT NULL,
  eenheid VARCHAR(20) NOT NULL,
  geschatte_kosten DECIMAL(10,2),
  categorie VARCHAR(30) NOT NULL,
  reden TEXT,
  geregistreerd_door UUID REFERENCES public.profiles(id),
  waste_datum DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_waste_categorie()
  RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.categorie NOT IN ('bederf','overproductie','bereidingsfout','schilafval','retour','overig') THEN
    RAISE EXCEPTION 'Invalid waste categorie: %', NEW.categorie;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_waste_categorie
  BEFORE INSERT OR UPDATE ON public.waste_registraties
  FOR EACH ROW EXECUTE FUNCTION public.validate_waste_categorie();

CREATE INDEX idx_waste_registraties_location_datum ON public.waste_registraties(location_id, waste_datum);
CREATE INDEX idx_waste_registraties_ingredient ON public.waste_registraties(ingredient_id);

ALTER TABLE public.waste_registraties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waste_select" ON public.waste_registraties
  FOR SELECT TO authenticated
  USING (public.user_has_location_access((SELECT auth.uid()), location_id));

CREATE POLICY "waste_insert" ON public.waste_registraties
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager','kitchen']::public.location_role[]));

CREATE POLICY "waste_update" ON public.waste_registraties
  FOR UPDATE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager']::public.location_role[]));

CREATE POLICY "waste_delete" ON public.waste_registraties
  FOR DELETE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager']::public.location_role[]));

-- ============================================================
-- FUNCTIES
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_bestelnummer(p_location_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_count INT;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.bestellingen
  WHERE location_id = p_location_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  RETURN v_year || '-' || LPAD(v_count::TEXT, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.process_bestelling_ontvangst()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  IF NEW.status = 'ontvangen' AND OLD.status != 'ontvangen' THEN
    FOR r IN
      SELECT br.ingredient_id,
             COALESCE(br.ontvangen_hoeveelheid, br.bestelde_hoeveelheid) as hoeveelheid,
             br.eenheid
      FROM public.bestelregels br
      WHERE br.bestelling_id = NEW.id
    LOOP
      INSERT INTO public.voorraad_bewegingen
        (ingredient_id, type, hoeveelheid, bron, referentie_type, referentie_id)
      VALUES
        (r.ingredient_id, 'IN', r.hoeveelheid,
         'Levering', 'bestelling', NEW.id);

      UPDATE public.ingredienten
      SET voorraad = voorraad + r.hoeveelheid, updated_at = now()
      WHERE id = r.ingredient_id;
    END LOOP;

    NEW.ontvangstdatum = CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bestelling_ontvangst
  BEFORE UPDATE ON public.bestellingen
  FOR EACH ROW EXECUTE FUNCTION public.process_bestelling_ontvangst();

CREATE OR REPLACE FUNCTION public.process_waste_registratie()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ingredient_id IS NOT NULL THEN
    INSERT INTO public.voorraad_bewegingen
      (ingredient_id, type, hoeveelheid, bron, referentie_type, referentie_id)
    VALUES
      (NEW.ingredient_id, 'WASTE', -NEW.hoeveelheid,
       'Waste: ' || NEW.categorie, 'waste', NEW.id);

    UPDATE public.ingredienten
    SET voorraad = voorraad - NEW.hoeveelheid, updated_at = now()
    WHERE id = NEW.ingredient_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_waste_registratie
  AFTER INSERT ON public.waste_registraties
  FOR EACH ROW EXECUTE FUNCTION public.process_waste_registratie();