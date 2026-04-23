-- ============================================================
-- PAKBON V1 — Etappe 1A: DB Foundation
-- Idempotent migration. Adds slug+domains columns, HACCP per-ingredient,
-- 5 new tables, 1 schema-ready table, RLS, audit trigger, storage bucket.
-- ============================================================

-- ----------------------------------------
-- 1. ENUMS (idempotent via DO blocks)
-- ----------------------------------------
DO $$ BEGIN
  CREATE TYPE public.haccp_categorie AS ENUM ('ambient','gekoeld','vries','vis_op_ijs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.goods_receipt_status AS ENUM (
    'verwachten','ontvangen_compleet','ontvangen_met_afwijking','geannuleerd'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.goods_receipt_line_status AS ENUM (
    'verwacht','akkoord','afwijking_missing','afwijking_beschadigd',
    'afwijking_verkeerd','afwijking_meer'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.credit_note_type AS ENUM (
    'missing','beschadigd','verkeerd','meer_dan_besteld'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.credit_note_status AS ENUM (
    'open','email_verzonden','alsnog_geleverd','credit_ontvangen',
    'handmatig_afgewikkeld','verlopen'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.credit_note_resolved_via AS ENUM (
    'alsnog_geleverd','credit_nota','handmatig','verlopen'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pakbon_intake_status AS ENUM (
    'pending','success','failed','rejected_unknown_sender',
    'rejected_unknown_location','rejected_duplicate'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pakbon_ai_parse_status AS ENUM ('pending','success','failed','partial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------
-- 2. EXISTING TABLE EXTENSIONS
-- ----------------------------------------

-- locations: pakbon slug + cc-list (NO domain stored — multi-tenant ready)
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS pakbon_slug TEXT,
  ADD COLUMN IF NOT EXISTS pakbon_cc_addresses TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE UNIQUE INDEX IF NOT EXISTS locations_pakbon_slug_unique
  ON public.locations (LOWER(pakbon_slug)) WHERE pakbon_slug IS NOT NULL;

COMMENT ON COLUMN public.locations.pakbon_slug IS
  'Slug-deel van inbound email pakbon+{slug}@pakbon.shouf.ai. Domein bewust niet opgeslagen (multi-tenant ready).';

-- leveranciers: email_domains whitelist (contact_email = bestaande "email" kolom)
ALTER TABLE public.leveranciers
  ADD COLUMN IF NOT EXISTS email_domains TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.leveranciers.email_domains IS
  'Whitelist van email-domeinen die pakbonnen mogen sturen voor deze leverancier. Lowercase, zonder @.';

-- ingredienten: per-ingredient HACCP overrides
ALTER TABLE public.ingredienten
  ADD COLUMN IF NOT EXISTS haccp_categorie public.haccp_categorie DEFAULT 'ambient',
  ADD COLUMN IF NOT EXISTS haccp_strict_temp_max NUMERIC;

COMMENT ON COLUMN public.ingredienten.haccp_categorie IS
  'Temperatuur-categorie. ambient=normaal, gekoeld=≤7°C, vries=≤-18°C, vis_op_ijs=≤2°C.';
COMMENT ON COLUMN public.ingredienten.haccp_strict_temp_max IS
  'Optionele striktere max-temperatuur dan de location-default (bv. 4°C voor pluimvee).';

-- ----------------------------------------
-- 3. NEW TABLE: goods_receipts
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  leverancier_id UUID REFERENCES public.leveranciers(id) ON DELETE SET NULL,
  bestelling_id UUID REFERENCES public.interne_bestellingen(id) ON DELETE SET NULL,

  pakbon_nummer TEXT,
  levering_datum DATE,
  ontvangst_status public.goods_receipt_status NOT NULL DEFAULT 'verwachten',
  ontvangen_door UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ontvangen_at TIMESTAMPTZ,

  email_raw_url TEXT,
  ai_parse_status public.pakbon_ai_parse_status DEFAULT 'pending',
  ai_raw_response JSONB,
  ai_model_version TEXT,
  ai_parse_confidence NUMERIC,
  ai_generated BOOLEAN NOT NULL DEFAULT true,

  notities TEXT,
  totaal_regels_verwacht INT DEFAULT 0,
  totaal_regels_akkoord INT DEFAULT 0,
  totaal_regels_afwijking INT DEFAULT 0,

  temp_gekoeld_gemeten NUMERIC,
  temp_vries_gemeten NUMERIC,
  temp_gemeten_door UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  temp_gemeten_at TIMESTAMPTZ,
  heeft_strict_temp_alarm BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goods_receipts_location ON public.goods_receipts(location_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_leverancier ON public.goods_receipts(leverancier_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_status ON public.goods_receipts(ontvangst_status);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_levering_datum ON public.goods_receipts(levering_datum DESC);
CREATE UNIQUE INDEX IF NOT EXISTS goods_receipts_dedup
  ON public.goods_receipts (location_id, leverancier_id, pakbon_nummer)
  WHERE pakbon_nummer IS NOT NULL AND leverancier_id IS NOT NULL;

-- ----------------------------------------
-- 4. NEW TABLE: goods_receipt_lines
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.goods_receipt_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id UUID NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,

  product_naam_herkend TEXT NOT NULL,
  ai_raw_naam TEXT,
  ai_raw_artikelnummer TEXT,
  ai_confidence NUMERIC,
  ai_confidence_per_field JSONB,

  hoeveelheid_verwacht NUMERIC,
  eenheid_verwacht TEXT,
  hoeveelheid_ontvangen NUMERIC,

  ingredient_id UUID REFERENCES public.ingredienten(id) ON DELETE SET NULL,
  is_nieuw_ingredient BOOLEAN DEFAULT false,
  match_confidence NUMERIC,
  match_status TEXT DEFAULT 'pending',

  haccp_categorie public.haccp_categorie,
  lotnummer TEXT,
  tht_datum DATE,

  status public.goods_receipt_line_status NOT NULL DEFAULT 'verwacht',
  afwijking_notitie TEXT,
  afwijking_foto_url TEXT,
  afgevinkt_door UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  afgevinkt_at TIMESTAMPTZ,

  validation_errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goods_receipt_lines_receipt ON public.goods_receipt_lines(goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_lines_ingredient ON public.goods_receipt_lines(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipt_lines_status ON public.goods_receipt_lines(status);

-- ----------------------------------------
-- 5. NEW TABLE: credit_note_requests
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_note_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id UUID NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  goods_receipt_line_id UUID REFERENCES public.goods_receipt_lines(id) ON DELETE SET NULL,
  leverancier_id UUID REFERENCES public.leveranciers(id) ON DELETE SET NULL,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,

  type public.credit_note_type NOT NULL,
  status public.credit_note_status NOT NULL DEFAULT 'open',

  email_message_id TEXT,
  email_verzonden_at TIMESTAMPTZ,

  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_via public.credit_note_resolved_via,

  aantal NUMERIC,
  eenheid TEXT,
  geschatte_waarde NUMERIC,
  leverancier_reactie TEXT,
  notities TEXT,

  dedup_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_note_requests_receipt ON public.credit_note_requests(goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_requests_leverancier ON public.credit_note_requests(leverancier_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_requests_status ON public.credit_note_requests(status);
CREATE INDEX IF NOT EXISTS idx_credit_note_requests_location ON public.credit_note_requests(location_id);
CREATE UNIQUE INDEX IF NOT EXISTS credit_note_requests_dedup
  ON public.credit_note_requests(dedup_key) WHERE dedup_key IS NOT NULL;

-- ----------------------------------------
-- 6. NEW TABLE: pakbon_email_intake
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.pakbon_email_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  to_address TEXT NOT NULL,
  from_address TEXT NOT NULL,
  subject TEXT,
  raw_email_url TEXT,
  attachments_urls TEXT[] DEFAULT ARRAY[]::TEXT[],

  matched_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  matched_leverancier_id UUID REFERENCES public.leveranciers(id) ON DELETE SET NULL,

  ai_parse_status public.pakbon_intake_status NOT NULL DEFAULT 'pending',
  goods_receipt_id UUID REFERENCES public.goods_receipts(id) ON DELETE SET NULL,
  error_reason TEXT,
  resend_message_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pakbon_intake_received ON public.pakbon_email_intake(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_pakbon_intake_status ON public.pakbon_email_intake(ai_parse_status);
CREATE INDEX IF NOT EXISTS idx_pakbon_intake_location ON public.pakbon_email_intake(matched_location_id);
CREATE UNIQUE INDEX IF NOT EXISTS pakbon_intake_message_id_unique
  ON public.pakbon_email_intake(resend_message_id) WHERE resend_message_id IS NOT NULL;

-- ----------------------------------------
-- 7. NEW TABLE: ai_correction_events (cross-tenant learning - log only V1)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_correction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL,
  source_id UUID NOT NULL,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  leverancier_id UUID REFERENCES public.leveranciers(id) ON DELETE SET NULL,
  field_path TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  confidence_before NUMERIC,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  corrected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_correction_leverancier ON public.ai_correction_events(leverancier_id);
CREATE INDEX IF NOT EXISTS idx_ai_correction_location ON public.ai_correction_events(location_id);
CREATE INDEX IF NOT EXISTS idx_ai_correction_source ON public.ai_correction_events(source_table, source_id);

-- ----------------------------------------
-- 8. NEW TABLE: leverancier_prompt_examples (V3 schema-ready)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS public.leverancier_prompt_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leverancier_id UUID NOT NULL REFERENCES public.leveranciers(id) ON DELETE CASCADE,
  example_pakbon_storage_url TEXT NOT NULL,
  expected_output JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  quality_score NUMERIC,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lev_prompt_examples_leverancier
  ON public.leverancier_prompt_examples(leverancier_id);

-- ----------------------------------------
-- 9. updated_at TRIGGERS
-- ----------------------------------------
DROP TRIGGER IF EXISTS goods_receipts_updated_at ON public.goods_receipts;
CREATE TRIGGER goods_receipts_updated_at
  BEFORE UPDATE ON public.goods_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS goods_receipt_lines_updated_at ON public.goods_receipt_lines;
CREATE TRIGGER goods_receipt_lines_updated_at
  BEFORE UPDATE ON public.goods_receipt_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS credit_note_requests_updated_at ON public.credit_note_requests;
CREATE TRIGGER credit_note_requests_updated_at
  BEFORE UPDATE ON public.credit_note_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------
-- 10. AI CORRECTION AUDIT TRIGGER (op goods_receipt_lines)
-- ----------------------------------------
CREATE OR REPLACE FUNCTION public.log_ai_correction_on_receipt_line()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location_id UUID;
  v_leverancier_id UUID;
BEGIN
  -- Alleen loggen bij user-acties (niet bij service-role inserts vanuit AI parse)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT location_id, leverancier_id INTO v_location_id, v_leverancier_id
  FROM public.goods_receipts WHERE id = NEW.goods_receipt_id;

  IF NEW.product_naam_herkend IS DISTINCT FROM OLD.product_naam_herkend THEN
    INSERT INTO public.ai_correction_events
      (source_table, source_id, location_id, leverancier_id, field_path,
       old_value, new_value, confidence_before, user_id)
    VALUES ('goods_receipt_lines', NEW.id, v_location_id, v_leverancier_id, 'product_naam_herkend',
       to_jsonb(OLD.product_naam_herkend), to_jsonb(NEW.product_naam_herkend),
       OLD.ai_confidence, auth.uid());
  END IF;

  IF NEW.hoeveelheid_ontvangen IS DISTINCT FROM OLD.hoeveelheid_ontvangen
     AND OLD.hoeveelheid_ontvangen IS NOT NULL THEN
    INSERT INTO public.ai_correction_events
      (source_table, source_id, location_id, leverancier_id, field_path,
       old_value, new_value, confidence_before, user_id)
    VALUES ('goods_receipt_lines', NEW.id, v_location_id, v_leverancier_id, 'hoeveelheid_ontvangen',
       to_jsonb(OLD.hoeveelheid_ontvangen), to_jsonb(NEW.hoeveelheid_ontvangen),
       OLD.ai_confidence, auth.uid());
  END IF;

  IF NEW.ingredient_id IS DISTINCT FROM OLD.ingredient_id THEN
    INSERT INTO public.ai_correction_events
      (source_table, source_id, location_id, leverancier_id, field_path,
       old_value, new_value, confidence_before, user_id)
    VALUES ('goods_receipt_lines', NEW.id, v_location_id, v_leverancier_id, 'ingredient_id',
       to_jsonb(OLD.ingredient_id), to_jsonb(NEW.ingredient_id),
       OLD.match_confidence, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_ai_correction_goods_receipt_lines ON public.goods_receipt_lines;
CREATE TRIGGER log_ai_correction_goods_receipt_lines
  AFTER UPDATE ON public.goods_receipt_lines
  FOR EACH ROW EXECUTE FUNCTION public.log_ai_correction_on_receipt_line();

-- ----------------------------------------
-- 11. RLS — alle nieuwe tabellen
-- ----------------------------------------
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_note_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pakbon_email_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_correction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leverancier_prompt_examples ENABLE ROW LEVEL SECURITY;

-- goods_receipts
DROP POLICY IF EXISTS "goods_receipts_select" ON public.goods_receipts;
CREATE POLICY "goods_receipts_select" ON public.goods_receipts
  FOR SELECT TO authenticated
  USING (public.user_has_location_access((SELECT auth.uid()), location_id));

DROP POLICY IF EXISTS "goods_receipts_insert" ON public.goods_receipts;
CREATE POLICY "goods_receipts_insert" ON public.goods_receipts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_role_in_location((SELECT auth.uid()), location_id,
      ARRAY['owner','manager','kitchen']::location_role[])
  );

DROP POLICY IF EXISTS "goods_receipts_update" ON public.goods_receipts;
CREATE POLICY "goods_receipts_update" ON public.goods_receipts
  FOR UPDATE TO authenticated
  USING (
    public.user_has_role_in_location((SELECT auth.uid()), location_id,
      ARRAY['owner','manager','kitchen']::location_role[])
  )
  WITH CHECK (
    public.user_has_role_in_location((SELECT auth.uid()), location_id,
      ARRAY['owner','manager','kitchen']::location_role[])
  );

DROP POLICY IF EXISTS "goods_receipts_delete" ON public.goods_receipts;
CREATE POLICY "goods_receipts_delete" ON public.goods_receipts
  FOR DELETE TO authenticated
  USING (
    public.user_has_role_in_location((SELECT auth.uid()), location_id,
      ARRAY['owner','manager']::location_role[])
  );

-- goods_receipt_lines (via parent)
DROP POLICY IF EXISTS "goods_receipt_lines_select" ON public.goods_receipt_lines;
CREATE POLICY "goods_receipt_lines_select" ON public.goods_receipt_lines
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.goods_receipts gr
    WHERE gr.id = goods_receipt_lines.goods_receipt_id
      AND public.user_has_location_access((SELECT auth.uid()), gr.location_id)
  ));

DROP POLICY IF EXISTS "goods_receipt_lines_insert" ON public.goods_receipt_lines;
CREATE POLICY "goods_receipt_lines_insert" ON public.goods_receipt_lines
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.goods_receipts gr
    WHERE gr.id = goods_receipt_lines.goods_receipt_id
      AND public.user_has_role_in_location((SELECT auth.uid()), gr.location_id,
        ARRAY['owner','manager','kitchen']::location_role[])
  ));

DROP POLICY IF EXISTS "goods_receipt_lines_update" ON public.goods_receipt_lines;
CREATE POLICY "goods_receipt_lines_update" ON public.goods_receipt_lines
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.goods_receipts gr
    WHERE gr.id = goods_receipt_lines.goods_receipt_id
      AND public.user_has_role_in_location((SELECT auth.uid()), gr.location_id,
        ARRAY['owner','manager','kitchen']::location_role[])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.goods_receipts gr
    WHERE gr.id = goods_receipt_lines.goods_receipt_id
      AND public.user_has_role_in_location((SELECT auth.uid()), gr.location_id,
        ARRAY['owner','manager','kitchen']::location_role[])
  ));

DROP POLICY IF EXISTS "goods_receipt_lines_delete" ON public.goods_receipt_lines;
CREATE POLICY "goods_receipt_lines_delete" ON public.goods_receipt_lines
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.goods_receipts gr
    WHERE gr.id = goods_receipt_lines.goods_receipt_id
      AND public.user_has_role_in_location((SELECT auth.uid()), gr.location_id,
        ARRAY['owner','manager']::location_role[])
  ));

-- credit_note_requests
DROP POLICY IF EXISTS "credit_note_requests_select" ON public.credit_note_requests;
CREATE POLICY "credit_note_requests_select" ON public.credit_note_requests
  FOR SELECT TO authenticated
  USING (public.user_has_location_access((SELECT auth.uid()), location_id));

DROP POLICY IF EXISTS "credit_note_requests_insert" ON public.credit_note_requests;
CREATE POLICY "credit_note_requests_insert" ON public.credit_note_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_role_in_location((SELECT auth.uid()), location_id,
      ARRAY['owner','manager','kitchen']::location_role[])
  );

DROP POLICY IF EXISTS "credit_note_requests_update" ON public.credit_note_requests;
CREATE POLICY "credit_note_requests_update" ON public.credit_note_requests
  FOR UPDATE TO authenticated
  USING (
    public.user_has_role_in_location((SELECT auth.uid()), location_id,
      ARRAY['owner','manager']::location_role[])
  )
  WITH CHECK (
    public.user_has_role_in_location((SELECT auth.uid()), location_id,
      ARRAY['owner','manager']::location_role[])
  );

-- pakbon_email_intake (alleen service role insert; users SELECT per location)
DROP POLICY IF EXISTS "pakbon_email_intake_select" ON public.pakbon_email_intake;
CREATE POLICY "pakbon_email_intake_select" ON public.pakbon_email_intake
  FOR SELECT TO authenticated
  USING (
    matched_location_id IS NOT NULL
    AND public.user_has_role_in_location((SELECT auth.uid()), matched_location_id,
      ARRAY['owner','manager']::location_role[])
  );

-- ai_correction_events (read-only voor owner/manager; insert via trigger met SECURITY DEFINER)
DROP POLICY IF EXISTS "ai_correction_events_select" ON public.ai_correction_events;
CREATE POLICY "ai_correction_events_select" ON public.ai_correction_events
  FOR SELECT TO authenticated
  USING (
    public.user_has_role_in_location((SELECT auth.uid()), location_id,
      ARRAY['owner','manager']::location_role[])
  );

-- leverancier_prompt_examples (platform-only V1)
DROP POLICY IF EXISTS "leverancier_prompt_examples_platform_only" ON public.leverancier_prompt_examples;
CREATE POLICY "leverancier_prompt_examples_platform_only" ON public.leverancier_prompt_examples
  FOR ALL TO authenticated
  USING (public.is_platform_user((SELECT auth.uid())))
  WITH CHECK (public.is_platform_user((SELECT auth.uid())));

-- ----------------------------------------
-- 12. STORAGE BUCKET — private 'pakbonnen'
-- ----------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pakbonnen', 'pakbonnen', false, 26214400,
  ARRAY['application/pdf','text/xml','application/xml',
        'image/png','image/jpeg','image/webp','image/tiff',
        'message/rfc822','text/plain','text/html']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "pakbonnen_select_per_location" ON storage.objects;
CREATE POLICY "pakbonnen_select_per_location" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pakbonnen'
    AND public.user_has_role_in_location(
      (SELECT auth.uid()),
      ((storage.foldername(name))[1])::uuid,
      ARRAY['owner','manager','kitchen']::location_role[]
    )
  );
-- Insert/update/delete bewust ALLEEN service-role (geen authenticated policy = no access)
