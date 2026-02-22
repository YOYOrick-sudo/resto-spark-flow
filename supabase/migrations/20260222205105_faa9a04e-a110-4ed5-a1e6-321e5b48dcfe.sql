
-- Popup suggestions table for AI-generated popup recommendations
CREATE TABLE public.marketing_popup_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  popup_type TEXT NOT NULL DEFAULT 'newsletter',
  headline TEXT NOT NULL,
  description TEXT NOT NULL,
  featured_ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  custom_button_url TEXT,
  button_text TEXT,
  reasoning TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  dismiss_reason TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Validation trigger for popup_type and status
CREATE OR REPLACE FUNCTION public.validate_popup_suggestion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.popup_type NOT IN ('reservation', 'newsletter', 'custom') THEN
    RAISE EXCEPTION 'Invalid popup_type: %', NEW.popup_type;
  END IF;
  IF NEW.status NOT IN ('pending', 'accepted', 'dismissed') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_popup_suggestion
  BEFORE INSERT OR UPDATE ON public.marketing_popup_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_popup_suggestion();

-- Indexes
CREATE INDEX idx_popup_suggestions_location ON public.marketing_popup_suggestions(location_id);
CREATE INDEX idx_popup_suggestions_status ON public.marketing_popup_suggestions(location_id, status);

-- RLS
ALTER TABLE public.marketing_popup_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY popup_suggestions_select ON public.marketing_popup_suggestions
  FOR SELECT USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY popup_suggestions_update ON public.marketing_popup_suggestions
  FOR UPDATE USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

CREATE POLICY popup_suggestions_insert ON public.marketing_popup_suggestions
  FOR INSERT WITH CHECK (true);

CREATE POLICY popup_suggestions_delete ON public.marketing_popup_suggestions
  FOR DELETE USING (public.user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
