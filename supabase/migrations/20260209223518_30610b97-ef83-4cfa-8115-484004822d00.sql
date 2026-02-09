
-- ============================================
-- TRIGGER FUNCTION: notify_signal_evaluation
-- Calls the evaluate-signals Edge Function when
-- config-related data changes.
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_signal_evaluation()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _location_id uuid;
  _payload jsonb;
BEGIN
  -- Determine location_id based on which table fired
  IF TG_TABLE_NAME = 'tables' THEN
    _location_id := COALESCE(NEW.location_id, OLD.location_id);
  ELSIF TG_TABLE_NAME = 'areas' THEN
    _location_id := COALESCE(NEW.location_id, OLD.location_id);
  ELSIF TG_TABLE_NAME = 'shifts' THEN
    _location_id := COALESCE(NEW.location_id, OLD.location_id);
  ELSIF TG_TABLE_NAME = 'table_group_members' THEN
    -- Get location from the table_group
    SELECT tg.location_id INTO _location_id
    FROM public.table_groups tg
    WHERE tg.id = COALESCE(NEW.table_group_id, OLD.table_group_id);
  ELSIF TG_TABLE_NAME = 'table_groups' THEN
    _location_id := COALESCE(NEW.location_id, OLD.location_id);
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF _location_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  _payload := jsonb_build_object(
    'location_id', _location_id,
    'source_table', TG_TABLE_NAME,
    'operation', TG_OP
  );

  PERFORM net.http_post(
    url := 'https://igqcfxizgtdkwnajvers.supabase.co/functions/v1/evaluate-signals',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncWNmeGl6Z3Rka3duYWp2ZXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NjgwMTYsImV4cCI6MjA4MzA0NDAxNn0.nlqsUnilbyP0bLiFECa5-whjgKJxOtSLh66cwdBUOaM"}'::jsonb,
    body := _payload
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ============================================
-- TRIGGERS on config tables
-- ============================================

-- Tables: when active status or area changes
CREATE TRIGGER trg_signal_eval_tables
  AFTER INSERT OR UPDATE OF is_active, area_id OR DELETE
  ON public.tables
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_signal_evaluation();

-- Areas: when active status changes
CREATE TRIGGER trg_signal_eval_areas
  AFTER UPDATE OF is_active
  ON public.areas
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_signal_evaluation();

-- Shifts: when active status or pacing changes
CREATE TRIGGER trg_signal_eval_shifts
  AFTER INSERT OR UPDATE OF is_active, arrival_interval_minutes OR DELETE
  ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_signal_evaluation();

-- Table group members: when members added/removed
CREATE TRIGGER trg_signal_eval_tgm
  AFTER INSERT OR DELETE
  ON public.table_group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_signal_evaluation();

-- Table groups: when active status changes
CREATE TRIGGER trg_signal_eval_table_groups
  AFTER UPDATE OF is_active
  ON public.table_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_signal_evaluation();
