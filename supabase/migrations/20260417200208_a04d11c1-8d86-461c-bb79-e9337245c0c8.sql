
-- ============================================================================
-- SPRINT 1 / DEEL 1.1 — Publieke sollicitatiepagina
-- ============================================================================

-- 1. unaccent extensie
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. TABEL: public_application_settings
CREATE TABLE public.public_application_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id     uuid NOT NULL UNIQUE REFERENCES public.locations(id) ON DELETE CASCADE,
  is_active       boolean NOT NULL DEFAULT true,
  slug            text NOT NULL UNIQUE,
  welcome_title   text NOT NULL DEFAULT 'Werken bij ons?',
  welcome_text    text,
  available_positions jsonb NOT NULL DEFAULT '["Bediening","Keuken","Bar","Afwas"]'::jsonb,
  show_hours      boolean NOT NULL DEFAULT true,
  show_start_date boolean NOT NULL DEFAULT true,
  success_message text NOT NULL DEFAULT 'Bedankt! We nemen zo snel mogelijk contact op.',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_application_settings_slug_format
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 60)
);

CREATE INDEX idx_pas_location_id ON public.public_application_settings(location_id);
CREATE INDEX idx_pas_slug_active ON public.public_application_settings(slug) WHERE is_active = true;

ALTER TABLE public.public_application_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active settings"
  ON public.public_application_settings FOR SELECT
  USING (is_active = true);

CREATE POLICY "Staff can view own location settings"
  ON public.public_application_settings FOR SELECT TO authenticated
  USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

CREATE POLICY "Staff can insert settings"
  ON public.public_application_settings FOR INSERT TO authenticated
  WITH CHECK (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

CREATE POLICY "Staff can update settings"
  ON public.public_application_settings FOR UPDATE TO authenticated
  USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

CREATE POLICY "Staff can delete settings"
  ON public.public_application_settings FOR DELETE TO authenticated
  USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

CREATE TRIGGER update_pas_updated_at
  BEFORE UPDATE ON public.public_application_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. TABEL: public_applications
CREATE TABLE public.public_applications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id         uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  first_name          text NOT NULL,
  last_name           text NOT NULL,
  email               text NOT NULL,
  phone               text,
  positions           jsonb NOT NULL DEFAULT '[]'::jsonb,
  availability_start  text,
  hours_preference    text,
  motivation          text,
  source              text NOT NULL DEFAULT 'website',
  source_tag          text,
  status              text NOT NULL DEFAULT 'converted',
  candidate_id        uuid,
  ip_hash             text,
  user_agent          text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pa_location_email_created
  ON public.public_applications(location_id, email, created_at DESC);
CREATE INDEX idx_pa_candidate_id ON public.public_applications(candidate_id);

ALTER TABLE public.public_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own location applications"
  ON public.public_applications FOR SELECT TO authenticated
  USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

CREATE POLICY "Staff can update own location applications"
  ON public.public_applications FOR UPDATE TO authenticated
  USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

CREATE POLICY "Staff can delete own location applications"
  ON public.public_applications FOR DELETE TO authenticated
  USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

-- 4. KOLOMMEN: onboarding_candidates uitbreiden
ALTER TABLE public.onboarding_candidates
  ADD COLUMN IF NOT EXISTS application_id      uuid,
  ADD COLUMN IF NOT EXISTS source              text,
  ADD COLUMN IF NOT EXISTS source_tag          text,
  ADD COLUMN IF NOT EXISTS positions           jsonb,
  ADD COLUMN IF NOT EXISTS availability_start  text,
  ADD COLUMN IF NOT EXISTS hours_preference    text,
  ADD COLUMN IF NOT EXISTS motivation          text;

CREATE INDEX IF NOT EXISTS idx_oc_application_id ON public.onboarding_candidates(application_id);
CREATE INDEX IF NOT EXISTS idx_oc_source ON public.onboarding_candidates(location_id, source);

-- FK's tussen public_applications en onboarding_candidates (na beide tabellen)
ALTER TABLE public.public_applications
  ADD CONSTRAINT public_applications_candidate_id_fkey
  FOREIGN KEY (candidate_id) REFERENCES public.onboarding_candidates(id) ON DELETE SET NULL;

ALTER TABLE public.onboarding_candidates
  ADD CONSTRAINT onboarding_candidates_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES public.public_applications(id) ON DELETE SET NULL;

-- 5. Helper: unieke kebab-case slug
CREATE OR REPLACE FUNCTION public.generate_unique_slug(_base_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug text;
  candidate_slug text;
  counter int := 1;
BEGIN
  base_slug := lower(unaccent(_base_name));
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF length(base_slug) < 3 THEN
    base_slug := 'locatie-' || substr(gen_random_uuid()::text, 1, 6);
  END IF;
  IF length(base_slug) > 50 THEN
    base_slug := substr(base_slug, 1, 50);
  END IF;
  candidate_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.public_application_settings WHERE slug = candidate_slug) LOOP
    counter := counter + 1;
    candidate_slug := base_slug || '-' || counter;
  END LOOP;
  RETURN candidate_slug;
END;
$$;

-- 6. SEED: bestaande locaties (is_active = false)
INSERT INTO public.public_application_settings (location_id, slug, is_active)
SELECT
  l.id,
  public.generate_unique_slug(l.name),
  false
FROM public.locations l
LEFT JOIN public.public_application_settings pas ON pas.location_id = l.id
WHERE pas.id IS NULL;

-- 7. Trigger: auto-settings bij nieuwe locatie
CREATE OR REPLACE FUNCTION public.create_application_settings_for_new_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.public_application_settings (location_id, slug, is_active)
  VALUES (NEW.id, public.generate_unique_slug(NEW.name), false)
  ON CONFLICT (location_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_application_settings_for_new_location
  AFTER INSERT ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_application_settings_for_new_location();

-- 8. RPC: get_public_branding (publieke branding-data via slug)
CREATE OR REPLACE FUNCTION public.get_public_branding(_slug text)
RETURNS TABLE (
  location_name text,
  logo_url text,
  brand_color text,
  welcome_title text,
  welcome_text text,
  available_positions jsonb,
  show_hours boolean,
  show_start_date boolean,
  success_message text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.name AS location_name,
    cs.logo_url,
    cs.brand_color,
    pas.welcome_title,
    pas.welcome_text,
    pas.available_positions,
    pas.show_hours,
    pas.show_start_date,
    pas.success_message
  FROM public.public_application_settings pas
  JOIN public.locations l ON l.id = pas.location_id
  LEFT JOIN public.communication_settings cs ON cs.location_id = pas.location_id
  WHERE pas.slug = _slug AND pas.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_branding(text) TO anon, authenticated;
