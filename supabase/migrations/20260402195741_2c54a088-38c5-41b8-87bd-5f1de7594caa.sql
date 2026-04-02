
CREATE TABLE public.day_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (location_id, date)
);

ALTER TABLE public.day_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view day notes for their location"
  ON public.day_notes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert day notes"
  ON public.day_notes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update day notes"
  ON public.day_notes FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER update_day_notes_updated_at
  BEFORE UPDATE ON public.day_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
