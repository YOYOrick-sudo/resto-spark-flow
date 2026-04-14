-- Add bron column to mep_tasks
ALTER TABLE public.mep_tasks ADD COLUMN IF NOT EXISTS bron VARCHAR(50);

-- Add buffer percentage to locations
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS besteladvies_buffer_percentage DECIMAL(5,2) DEFAULT 20.00;

-- Create interne_bestellingen
CREATE TABLE public.interne_bestellingen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  van_location_id UUID NOT NULL REFERENCES public.locations(id),
  naar_location_id UUID NOT NULL REFERENCES public.locations(id),
  status VARCHAR(20) NOT NULL DEFAULT 'aangevraagd',
  aangevraagd_door UUID REFERENCES public.profiles(id),
  aangevraagd_op TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  geaccepteerd_op TIMESTAMPTZ,
  verzonden_op TIMESTAMPTZ,
  ontvangen_op TIMESTAMPTZ,
  gewenste_datum DATE,
  notities TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_interne_bestelling_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('aangevraagd','geaccepteerd','in_productie','verzonden','ontvangen','geannuleerd') THEN
    RAISE EXCEPTION 'Ongeldige status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_interne_bestelling_status
  BEFORE INSERT OR UPDATE ON public.interne_bestellingen
  FOR EACH ROW EXECUTE FUNCTION public.validate_interne_bestelling_status();

-- Create interne_bestelregels
CREATE TABLE public.interne_bestelregels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bestelling_id UUID NOT NULL REFERENCES public.interne_bestellingen(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.ingredienten(id),
  recept_id UUID REFERENCES public.recepten(id),
  omschrijving VARCHAR(255) NOT NULL,
  gevraagde_hoeveelheid DECIMAL(10,2) NOT NULL,
  geaccepteerde_hoeveelheid DECIMAL(10,2),
  verzonden_hoeveelheid DECIMAL(10,2),
  ontvangen_hoeveelheid DECIMAL(10,2),
  eenheid VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_interne_bestellingen_org_status ON public.interne_bestellingen(organization_id, status);
CREATE INDEX idx_interne_bestellingen_van ON public.interne_bestellingen(van_location_id);
CREATE INDEX idx_interne_bestellingen_naar ON public.interne_bestellingen(naar_location_id);
CREATE INDEX idx_interne_bestelregels_bestelling ON public.interne_bestelregels(bestelling_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_interne_bestelling_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_interne_bestelling_updated_at
  BEFORE UPDATE ON public.interne_bestellingen
  FOR EACH ROW EXECUTE FUNCTION public.update_interne_bestelling_updated_at();

-- Process trigger (voorraad + MEP)
CREATE OR REPLACE FUNCTION public.process_interne_bestelling()
RETURNS TRIGGER AS $$
DECLARE r RECORD;
BEGIN
  -- GEACCEPTEERD: maak MEP taken voor halffabricaten
  IF NEW.status = 'geaccepteerd' AND OLD.status != 'geaccepteerd' THEN
    FOR r IN
      SELECT ibr.*, ib.van_location_id, ib.gewenste_datum,
             nl.name as naar_location_naam
      FROM public.interne_bestelregels ibr
      JOIN public.interne_bestellingen ib ON ib.id = ibr.bestelling_id
      JOIN public.locations nl ON nl.id = ib.naar_location_id
      WHERE ibr.bestelling_id = NEW.id AND ibr.recept_id IS NOT NULL
    LOOP
      INSERT INTO public.mep_tasks (location_id, title, category, task_date, recept_id,
                             methode_id, units, prioriteit, status, bron)
      SELECT
        NEW.van_location_id,
        r.omschrijving || ' (voor ' || r.naar_location_naam || ')',
        'interne bestelling',
        COALESCE(r.gewenste_datum, CURRENT_DATE + 1),
        r.recept_id,
        hm.id,
        COALESCE(r.geaccepteerde_hoeveelheid, r.gevraagde_hoeveelheid),
        'Normaal',
        'pending',
        'interne_bestelling'
      FROM public.halffabricaat_methodes hm
      WHERE hm.recept_id = r.recept_id
      ORDER BY hm.sort_order ASC
      LIMIT 1;
    END LOOP;
    NEW.geaccepteerd_op = NOW();
  END IF;

  -- VERZONDEN: negatieve voorraad bij van_location
  IF NEW.status = 'verzonden' AND OLD.status != 'verzonden' THEN
    FOR r IN
      SELECT ibr.ingredient_id,
             COALESCE(ibr.verzonden_hoeveelheid, ibr.geaccepteerde_hoeveelheid, ibr.gevraagde_hoeveelheid) as hoeveelheid
      FROM public.interne_bestelregels ibr
      WHERE ibr.bestelling_id = NEW.id AND ibr.ingredient_id IS NOT NULL
    LOOP
      INSERT INTO public.voorraad_bewegingen
        (ingredient_id, type, hoeveelheid, bron, referentie_type, referentie_id)
      VALUES
        (r.ingredient_id, 'TRANSFER', -r.hoeveelheid,
         'Transfer naar andere vestiging', 'interne_bestelling', NEW.id::text);
      UPDATE public.ingredienten
      SET voorraad = voorraad - r.hoeveelheid, updated_at = NOW()
      WHERE id = r.ingredient_id AND location_id = NEW.van_location_id;
    END LOOP;
    NEW.verzonden_op = NOW();
  END IF;

  -- ONTVANGEN: positieve voorraad bij naar_location
  IF NEW.status = 'ontvangen' AND OLD.status != 'ontvangen' THEN
    FOR r IN
      SELECT ibr.ingredient_id,
             COALESCE(ibr.ontvangen_hoeveelheid, ibr.verzonden_hoeveelheid, ibr.geaccepteerde_hoeveelheid, ibr.gevraagde_hoeveelheid) as hoeveelheid
      FROM public.interne_bestelregels ibr
      WHERE ibr.bestelling_id = NEW.id AND ibr.ingredient_id IS NOT NULL
    LOOP
      INSERT INTO public.voorraad_bewegingen
        (ingredient_id, type, hoeveelheid, bron, referentie_type, referentie_id)
      VALUES
        (r.ingredient_id, 'TRANSFER', r.hoeveelheid,
         'Transfer van andere vestiging', 'interne_bestelling', NEW.id::text);
      UPDATE public.ingredienten
      SET voorraad = voorraad + r.hoeveelheid, updated_at = NOW()
      WHERE id = r.ingredient_id AND location_id = NEW.naar_location_id;
    END LOOP;
    NEW.ontvangen_op = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_process_interne_bestelling
  BEFORE UPDATE ON public.interne_bestellingen
  FOR EACH ROW EXECUTE FUNCTION public.process_interne_bestelling();

-- RLS
ALTER TABLE public.interne_bestellingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interne_bestelregels ENABLE ROW LEVEL SECURITY;

-- interne_bestellingen policies
CREATE POLICY "Users can view org internal orders"
  ON public.interne_bestellingen FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.organization_id = interne_bestellingen.organization_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can create org internal orders"
  ON public.interne_bestellingen FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.organization_id = interne_bestellingen.organization_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update org internal orders"
  ON public.interne_bestellingen FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.organization_id = interne_bestellingen.organization_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Owners can delete org internal orders"
  ON public.interne_bestellingen FOR DELETE TO authenticated
  USING (
    aangevraagd_door = (SELECT auth.uid())
  );

-- interne_bestelregels policies (via join)
CREATE POLICY "Users can view org internal order lines"
  ON public.interne_bestelregels FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interne_bestellingen ib
      JOIN public.org_memberships om ON om.organization_id = ib.organization_id
      WHERE ib.id = interne_bestelregels.bestelling_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert org internal order lines"
  ON public.interne_bestelregels FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interne_bestellingen ib
      JOIN public.org_memberships om ON om.organization_id = ib.organization_id
      WHERE ib.id = interne_bestelregels.bestelling_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update org internal order lines"
  ON public.interne_bestelregels FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interne_bestellingen ib
      JOIN public.org_memberships om ON om.organization_id = ib.organization_id
      WHERE ib.id = interne_bestelregels.bestelling_id
        AND om.user_id = (SELECT auth.uid())
    )
  );