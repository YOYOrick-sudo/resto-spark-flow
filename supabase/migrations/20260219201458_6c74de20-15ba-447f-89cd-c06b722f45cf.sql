
CREATE OR REPLACE FUNCTION public.validate_widget_style()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.widget_style NOT IN ('auto', 'showcase', 'quick') THEN
    RAISE EXCEPTION 'widget_style must be auto, showcase, or quick';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
