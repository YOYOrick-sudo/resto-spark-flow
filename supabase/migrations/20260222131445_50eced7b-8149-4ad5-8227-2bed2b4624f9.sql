
-- marketing_reviews table
CREATE TABLE public.marketing_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  external_review_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  author_photo_url TEXT,
  rating INTEGER NOT NULL,
  review_text TEXT,
  review_language TEXT DEFAULT 'nl',
  published_at TIMESTAMPTZ,
  sentiment TEXT DEFAULT 'neutral',
  sentiment_aspects JSONB DEFAULT '{}',
  ai_suggested_response TEXT,
  response_text TEXT,
  responded_at TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, platform, external_review_id)
);

ALTER TABLE public.marketing_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY reviews_select ON public.marketing_reviews
  FOR SELECT USING (user_has_location_access(auth.uid(), location_id));

CREATE POLICY reviews_insert ON public.marketing_reviews
  FOR INSERT WITH CHECK (user_has_role_in_location(auth.uid(), location_id,
    ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY reviews_update ON public.marketing_reviews
  FOR UPDATE USING (user_has_role_in_location(auth.uid(), location_id,
    ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY reviews_delete ON public.marketing_reviews
  FOR DELETE USING (user_has_role_in_location(auth.uid(), location_id,
    ARRAY['owner'::location_role, 'manager'::location_role]));

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_marketing_review()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.sentiment NOT IN ('positive', 'neutral', 'negative') THEN
    RAISE EXCEPTION 'Invalid sentiment';
  END IF;
  IF NEW.platform NOT IN ('google', 'tripadvisor') THEN
    RAISE EXCEPTION 'Invalid platform';
  END IF;
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Invalid rating';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_marketing_review
  BEFORE INSERT OR UPDATE ON public.marketing_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_marketing_review();

-- Updated_at trigger
CREATE TRIGGER update_marketing_reviews_updated_at
  BEFORE UPDATE ON public.marketing_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_marketing_reviews_location_platform ON public.marketing_reviews(location_id, platform);
CREATE INDEX idx_marketing_reviews_rating ON public.marketing_reviews(location_id, rating);
CREATE INDEX idx_marketing_reviews_sentiment ON public.marketing_reviews(location_id, sentiment);
