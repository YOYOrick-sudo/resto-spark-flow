
CREATE TABLE public.mep_favorieten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  title varchar NOT NULL,
  category varchar NOT NULL DEFAULT 'Overig',
  recept_id uuid REFERENCES public.recepten(id) ON DELETE CASCADE,
  methode_id uuid REFERENCES public.halffabricaat_methodes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, title)
);

ALTER TABLE public.mep_favorieten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own location favorieten"
  ON public.mep_favorieten FOR ALL TO authenticated
  USING (location_id IN (
    SELECT location_id FROM public.user_location_roles
    WHERE user_id = auth.uid()
  ))
  WITH CHECK (location_id IN (
    SELECT location_id FROM public.user_location_roles
    WHERE user_id = auth.uid()
  ));
