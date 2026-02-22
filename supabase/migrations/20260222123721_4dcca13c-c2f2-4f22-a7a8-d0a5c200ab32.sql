
CREATE TABLE public.marketing_brand_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  content_type_performance JSONB DEFAULT '{}'::jsonb,
  optimal_post_times JSONB DEFAULT '{}'::jsonb,
  top_hashtag_sets JSONB DEFAULT '[]'::jsonb,
  caption_style_profile TEXT,
  visual_style_profile TEXT,
  engagement_baseline JSONB DEFAULT '{}'::jsonb,
  weekly_best_content_type TEXT,
  learning_stage TEXT NOT NULL DEFAULT 'onboarding',
  posts_analyzed INTEGER NOT NULL DEFAULT 0,
  current_weekplan JSONB,
  last_analysis_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT marketing_brand_intelligence_location_unique UNIQUE (location_id)
);

ALTER TABLE public.marketing_brand_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY bi_select ON public.marketing_brand_intelligence
  FOR SELECT USING (user_has_location_access(auth.uid(), location_id));

CREATE POLICY bi_insert ON public.marketing_brand_intelligence
  FOR INSERT WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY bi_update ON public.marketing_brand_intelligence
  FOR UPDATE USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE OR REPLACE FUNCTION public.validate_learning_stage()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.learning_stage NOT IN ('onboarding', 'learning', 'optimizing', 'mature') THEN
    RAISE EXCEPTION 'Invalid learning_stage: must be onboarding, learning, optimizing, or mature';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_learning_stage
  BEFORE INSERT OR UPDATE ON public.marketing_brand_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.validate_learning_stage();
