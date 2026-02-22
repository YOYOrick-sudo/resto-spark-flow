
-- Add scheduling columns to marketing_popup_config
ALTER TABLE public.marketing_popup_config
  ADD COLUMN schedule_start_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN schedule_end_at TIMESTAMPTZ DEFAULT NULL;

-- Validation trigger: schedule_end_at must be after schedule_start_at
CREATE OR REPLACE FUNCTION public.validate_popup_schedule()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.schedule_start_at IS NOT NULL AND NEW.schedule_end_at IS NOT NULL THEN
    IF NEW.schedule_end_at <= NEW.schedule_start_at THEN
      RAISE EXCEPTION 'schedule_end_at must be after schedule_start_at';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_validate_popup_schedule
  BEFORE INSERT OR UPDATE ON public.marketing_popup_config
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_popup_schedule();
