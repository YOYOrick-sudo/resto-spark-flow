
-- 1. Kolom op leveranciers
ALTER TABLE public.leveranciers 
ADD COLUMN IF NOT EXISTS koppeling_type VARCHAR(20) NOT NULL DEFAULT 'handmatig';

CREATE OR REPLACE FUNCTION public.validate_leverancier_koppeling_type()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.koppeling_type NOT IN ('handmatig', 'api') THEN
    RAISE EXCEPTION 'Invalid koppeling_type: %', NEW.koppeling_type;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_leverancier_koppeling_type
  BEFORE INSERT OR UPDATE ON public.leveranciers
  FOR EACH ROW EXECUTE FUNCTION public.validate_leverancier_koppeling_type();

-- 2. factuur_uploads
CREATE TABLE public.factuur_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  bestandsnaam VARCHAR(255) NOT NULL,
  bestand_url TEXT NOT NULL,
  bron VARCHAR(20) NOT NULL DEFAULT 'upload',
  status VARCHAR(20) NOT NULL DEFAULT 'review',
  leverancier_id UUID REFERENCES public.leveranciers(id),
  leverancier_naam_herkend VARCHAR(255),
  factuurnummer VARCHAR(100),
  factuurdatum DATE,
  totaalbedrag DECIMAL(10,2),
  verwerkt_op TIMESTAMPTZ,
  goedgekeurd_door UUID REFERENCES public.profiles(id),
  goedgekeurd_op TIMESTAMPTZ,
  ruwe_tekst TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.validate_factuur_uploads_fields()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.bron NOT IN ('upload', 'email') THEN
    RAISE EXCEPTION 'Invalid bron: %', NEW.bron;
  END IF;
  IF NEW.status NOT IN ('verwerken', 'review', 'goedgekeurd', 'afgewezen') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_factuur_uploads
  BEFORE INSERT OR UPDATE ON public.factuur_uploads
  FOR EACH ROW EXECUTE FUNCTION public.validate_factuur_uploads_fields();

CREATE INDEX idx_factuur_uploads_loc_status ON public.factuur_uploads(location_id, status);
CREATE INDEX idx_factuur_uploads_loc_created ON public.factuur_uploads(location_id, created_at DESC);

CREATE TRIGGER update_factuur_uploads_updated_at
  BEFORE UPDATE ON public.factuur_uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.factuur_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "factuur_uploads_select" ON public.factuur_uploads
  FOR SELECT TO authenticated
  USING (public.user_has_location_access((SELECT auth.uid()), location_id));

CREATE POLICY "factuur_uploads_insert" ON public.factuur_uploads
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager','kitchen']::public.location_role[]));

CREATE POLICY "factuur_uploads_update" ON public.factuur_uploads
  FOR UPDATE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager','kitchen']::public.location_role[]));

CREATE POLICY "factuur_uploads_delete" ON public.factuur_uploads
  FOR DELETE TO authenticated
  USING (public.user_has_role_in_location((SELECT auth.uid()), location_id, ARRAY['owner','manager']::public.location_role[]));

-- 3. factuur_regels
CREATE TABLE public.factuur_regels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factuur_id UUID NOT NULL REFERENCES public.factuur_uploads(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.ingredienten(id),
  product_naam_herkend VARCHAR(255) NOT NULL,
  hoeveelheid DECIMAL(10,2),
  eenheid VARCHAR(20),
  prijs_per_eenheid DECIMAL(10,4),
  totaal DECIMAL(10,2),
  match_status VARCHAR(20) NOT NULL DEFAULT 'niet_gematcht',
  match_confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.validate_factuur_regels_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.match_status NOT IN ('gematcht', 'niet_gematcht', 'handmatig', 'overgeslagen') THEN
    RAISE EXCEPTION 'Invalid match_status: %', NEW.match_status;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_factuur_regels
  BEFORE INSERT OR UPDATE ON public.factuur_regels
  FOR EACH ROW EXECUTE FUNCTION public.validate_factuur_regels_status();

CREATE INDEX idx_factuur_regels_factuur ON public.factuur_regels(factuur_id);
CREATE INDEX idx_factuur_regels_ingredient ON public.factuur_regels(ingredient_id);

ALTER TABLE public.factuur_regels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "factuur_regels_select" ON public.factuur_regels
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.factuur_uploads f
    WHERE f.id = factuur_regels.factuur_id
      AND public.user_has_location_access((SELECT auth.uid()), f.location_id)
  ));

CREATE POLICY "factuur_regels_insert" ON public.factuur_regels
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.factuur_uploads f
    WHERE f.id = factuur_regels.factuur_id
      AND public.user_has_role_in_location((SELECT auth.uid()), f.location_id, ARRAY['owner','manager','kitchen']::public.location_role[])
  ));

CREATE POLICY "factuur_regels_update" ON public.factuur_regels
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.factuur_uploads f
    WHERE f.id = factuur_regels.factuur_id
      AND public.user_has_role_in_location((SELECT auth.uid()), f.location_id, ARRAY['owner','manager','kitchen']::public.location_role[])
  ));

CREATE POLICY "factuur_regels_delete" ON public.factuur_regels
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.factuur_uploads f
    WHERE f.id = factuur_regels.factuur_id
      AND public.user_has_role_in_location((SELECT auth.uid()), f.location_id, ARRAY['owner','manager']::public.location_role[])
  ));

-- 4. Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('facturen', 'facturen', false);

CREATE POLICY "facturen_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'facturen'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND public.user_has_location_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "facturen_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'facturen'
    AND public.user_has_location_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "facturen_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'facturen'
    AND public.user_has_role_in_location(auth.uid(), ((storage.foldername(name))[1])::uuid, ARRAY['owner','manager']::public.location_role[])
  );
