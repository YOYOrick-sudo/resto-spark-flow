
-- Create coaching tips table
CREATE TABLE public.marketing_coaching_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  tip_type TEXT NOT NULL DEFAULT 'performance',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_coaching_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY coaching_tips_select ON public.marketing_coaching_tips
  FOR SELECT USING (user_has_location_access(auth.uid(), location_id));

CREATE POLICY coaching_tips_update ON public.marketing_coaching_tips
  FOR UPDATE USING (user_has_role_in_location(auth.uid(), location_id,
    ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY coaching_tips_delete ON public.marketing_coaching_tips
  FOR DELETE USING (user_has_role_in_location(auth.uid(), location_id,
    ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY coaching_tips_insert ON public.marketing_coaching_tips
  FOR INSERT WITH CHECK (user_has_role_in_location(auth.uid(), location_id,
    ARRAY['owner'::location_role, 'manager'::location_role]));

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_coaching_tip()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.tip_type NOT IN ('performance', 'timing', 'content_mix', 'growth', 'warning') THEN
    RAISE EXCEPTION 'Invalid tip_type: %', NEW.tip_type;
  END IF;
  IF NEW.status NOT IN ('active', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_coaching_tip
  BEFORE INSERT OR UPDATE ON public.marketing_coaching_tips
  FOR EACH ROW EXECUTE FUNCTION public.validate_coaching_tip();
