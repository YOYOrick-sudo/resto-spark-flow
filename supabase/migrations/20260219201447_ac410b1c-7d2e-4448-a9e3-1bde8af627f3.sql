
ALTER TABLE public.widget_settings
  ADD COLUMN widget_style text NOT NULL DEFAULT 'auto';

CREATE OR REPLACE FUNCTION public.validate_widget_style()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.widget_style NOT IN ('auto', 'showcase', 'quick') THEN
    RAISE EXCEPTION 'widget_style must be auto, showcase, or quick';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_widget_style
  BEFORE INSERT OR UPDATE ON public.widget_settings
  FOR EACH ROW EXECUTE FUNCTION public.validate_widget_style();
