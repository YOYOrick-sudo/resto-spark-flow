
-- Content Series table for optional recurring content planning
CREATE TABLE public.marketing_content_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  preferred_day TEXT,
  content_type TEXT,
  template_prompt TEXT,
  episode_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_content_series ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "content_series_select"
  ON public.marketing_content_series FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));

CREATE POLICY "content_series_insert"
  ON public.marketing_content_series FOR INSERT
  WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY "content_series_update"
  ON public.marketing_content_series FOR UPDATE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY "content_series_delete"
  ON public.marketing_content_series FOR DELETE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

-- Updated_at trigger
CREATE TRIGGER update_marketing_content_series_updated_at
  BEFORE UPDATE ON public.marketing_content_series
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
