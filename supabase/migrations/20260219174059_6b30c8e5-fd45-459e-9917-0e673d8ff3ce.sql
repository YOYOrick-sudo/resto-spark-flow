
-- =============================================
-- Fase 4.10 Stap 1: widget_settings + reservations.tags
-- =============================================

-- 1. Create widget_settings table
CREATE TABLE public.widget_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL UNIQUE REFERENCES public.locations(id) ON DELETE CASCADE,
  widget_enabled BOOLEAN NOT NULL DEFAULT false,
  location_slug TEXT UNIQUE,
  widget_primary_color TEXT NOT NULL DEFAULT '#10B981',
  widget_logo_url TEXT,
  widget_welcome_text TEXT,
  widget_success_redirect_url TEXT,
  unavailable_text TEXT NOT NULL DEFAULT 'vol',
  show_end_time BOOLEAN NOT NULL DEFAULT true,
  show_nesto_branding BOOLEAN NOT NULL DEFAULT true,
  booking_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  google_reserve_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.widget_settings ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "widget_settings_select"
  ON public.widget_settings FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));

CREATE POLICY "widget_settings_insert"
  ON public.widget_settings FOR INSERT
  WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY "widget_settings_update"
  ON public.widget_settings FOR UPDATE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY "widget_settings_delete"
  ON public.widget_settings FOR DELETE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

-- 4. updated_at trigger
CREATE TRIGGER update_widget_settings_updated_at
  BEFORE UPDATE ON public.widget_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Validation trigger: location_slug format
CREATE OR REPLACE FUNCTION public.validate_widget_settings_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.location_slug IS NOT NULL AND NEW.location_slug !~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' THEN
    RAISE EXCEPTION 'Invalid slug format: must match ^[a-z0-9][a-z0-9-]*[a-z0-9]$'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_widget_settings_slug
  BEFORE INSERT OR UPDATE ON public.widget_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_widget_settings_slug();

-- 6. Validation trigger: unavailable_text enum
CREATE OR REPLACE FUNCTION public.validate_widget_settings_unavailable_text()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.unavailable_text NOT IN ('vol', 'walk_in_only', 'bel_ons') THEN
    RAISE EXCEPTION 'Invalid unavailable_text: must be vol, walk_in_only, or bel_ons'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_widget_settings_unavailable_text
  BEFORE INSERT OR UPDATE ON public.widget_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_widget_settings_unavailable_text();

-- 7. Add tags column to reservations
ALTER TABLE public.reservations ADD COLUMN tags JSONB NOT NULL DEFAULT '[]'::jsonb;
