
-- 1. Add task_type to ob_tasks
ALTER TABLE public.ob_tasks ADD COLUMN task_type text NOT NULL DEFAULT 'other';

-- 2. Add assistant_enabled to onboarding_settings
ALTER TABLE public.onboarding_settings ADD COLUMN assistant_enabled boolean NOT NULL DEFAULT true;

-- 3. Drop assistant_enabled from onboarding_phases
ALTER TABLE public.onboarding_phases DROP COLUMN assistant_enabled;

-- 4. Update generate_initial_onboarding_tasks to include task_type
CREATE OR REPLACE FUNCTION public.generate_initial_onboarding_tasks()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _first_phase RECORD;
  _task JSONB;
  _sort INTEGER := 0;
BEGIN
  SELECT * INTO _first_phase
  FROM onboarding_phases
  WHERE location_id = NEW.location_id AND is_active = true
  ORDER BY sort_order ASC LIMIT 1;

  IF _first_phase IS NULL THEN RETURN NEW; END IF;

  IF NEW.current_phase_id IS NULL THEN
    UPDATE onboarding_candidates SET current_phase_id = _first_phase.id WHERE id = NEW.id;
  END IF;

  IF _first_phase.task_templates IS NOT NULL AND jsonb_array_length(_first_phase.task_templates) > 0 THEN
    FOR _task IN SELECT * FROM jsonb_array_elements(_first_phase.task_templates)
    LOOP
      _sort := _sort + 10;
      INSERT INTO ob_tasks (candidate_id, location_id, phase_id, title, description, assigned_role, is_automated, sort_order, task_type)
      VALUES (
        NEW.id, NEW.location_id, _first_phase.id,
        _task->>'title', _task->>'description',
        CASE WHEN _task->>'assigned_role' IS NOT NULL THEN (_task->>'assigned_role')::location_role ELSE NULL END,
        COALESCE((_task->>'is_automated')::boolean, false), _sort,
        COALESCE(_task->>'task_type', 'other')
      );
    END LOOP;
  END IF;

  INSERT INTO onboarding_events (candidate_id, location_id, event_type, event_data, triggered_by)
  VALUES (NEW.id, NEW.location_id, 'candidate_created',
    jsonb_build_object('phase_id', _first_phase.id, 'phase_name', _first_phase.name), 'system');

  INSERT INTO onboarding_phase_logs (candidate_id, phase_id, entered_at)
  VALUES (NEW.id, _first_phase.id, now());

  RETURN NEW;
END;
$function$;

-- 5. Update advance_onboarding_phase to include task_type
CREATE OR REPLACE FUNCTION public.advance_onboarding_phase(_candidate_id uuid, _user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _candidate RECORD;
  _current_phase RECORD;
  _next_phase RECORD;
  _task JSONB;
  _sort INTEGER := 0;
  _result JSONB;
BEGIN
  SELECT * INTO _candidate FROM onboarding_candidates WHERE id = _candidate_id;
  IF _candidate IS NULL THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  IF NOT user_has_role_in_location(_user_id, _candidate.location_id, ARRAY['owner','manager']::location_role[]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _candidate.status != 'active' THEN
    RAISE EXCEPTION 'Candidate is not active (status: %)', _candidate.status;
  END IF;

  IF _candidate.current_phase_id IS NULL THEN
    RAISE EXCEPTION 'Candidate has no current phase';
  END IF;

  IF EXISTS (
    SELECT 1 FROM ob_tasks
    WHERE candidate_id = _candidate_id
      AND phase_id = _candidate.current_phase_id
      AND status NOT IN ('completed', 'skipped')
  ) THEN
    RAISE EXCEPTION 'Not all tasks in the current phase are completed';
  END IF;

  SELECT * INTO _current_phase FROM onboarding_phases WHERE id = _candidate.current_phase_id;

  SELECT * INTO _next_phase FROM onboarding_phases
  WHERE location_id = _candidate.location_id
    AND is_active = true
    AND sort_order > _current_phase.sort_order
  ORDER BY sort_order ASC LIMIT 1;

  IF _next_phase IS NULL THEN
    UPDATE onboarding_candidates SET status = 'hired', updated_at = now() WHERE id = _candidate_id;

    UPDATE onboarding_phase_logs SET exited_at = now()
    WHERE candidate_id = _candidate_id AND phase_id = _current_phase.id AND exited_at IS NULL;

    INSERT INTO onboarding_events (candidate_id, location_id, event_type, event_data, triggered_by, actor_id)
    VALUES (_candidate_id, _candidate.location_id, 'hired',
      jsonb_build_object('final_phase_id', _current_phase.id, 'final_phase_name', _current_phase.name),
      'user', _user_id);

    _result := jsonb_build_object('action', 'hired', 'candidate_id', _candidate_id);
  ELSE
    UPDATE onboarding_candidates SET current_phase_id = _next_phase.id, updated_at = now() WHERE id = _candidate_id;

    UPDATE onboarding_phase_logs SET exited_at = now()
    WHERE candidate_id = _candidate_id AND phase_id = _current_phase.id AND exited_at IS NULL;

    INSERT INTO onboarding_phase_logs (candidate_id, phase_id, entered_at, created_by)
    VALUES (_candidate_id, _next_phase.id, now(), _user_id);

    IF _next_phase.task_templates IS NOT NULL AND jsonb_array_length(_next_phase.task_templates) > 0 THEN
      FOR _task IN SELECT * FROM jsonb_array_elements(_next_phase.task_templates)
      LOOP
        _sort := _sort + 10;
        INSERT INTO ob_tasks (candidate_id, location_id, phase_id, title, description, assigned_role, is_automated, sort_order, task_type)
        VALUES (
          _candidate_id, _candidate.location_id, _next_phase.id,
          _task->>'title', _task->>'description',
          CASE WHEN _task->>'assigned_role' IS NOT NULL THEN (_task->>'assigned_role')::location_role ELSE NULL END,
          COALESCE((_task->>'is_automated')::boolean, false), _sort,
          COALESCE(_task->>'task_type', 'other')
        );
      END LOOP;
    END IF;

    INSERT INTO onboarding_events (candidate_id, location_id, event_type, event_data, triggered_by, actor_id)
    VALUES (_candidate_id, _candidate.location_id, 'phase_advanced',
      jsonb_build_object('from_phase_id', _current_phase.id, 'from_phase_name', _current_phase.name,
                         'to_phase_id', _next_phase.id, 'to_phase_name', _next_phase.name),
      'user', _user_id);

    _result := jsonb_build_object('action', 'advanced', 'candidate_id', _candidate_id,
      'from_phase', _current_phase.name, 'to_phase', _next_phase.name);
  END IF;

  RETURN _result;
END;
$function$;
