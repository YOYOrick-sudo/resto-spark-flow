
-- 1. Drop the automatic phase completion trigger on ob_tasks
DROP TRIGGER IF EXISTS trg_check_onboarding_phase_completion ON public.ob_tasks;

-- 2. Drop the old function
DROP FUNCTION IF EXISTS public.check_onboarding_phase_completion();

-- 3. Create new RPC for manual phase advancement
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
  -- Get candidate
  SELECT * INTO _candidate FROM onboarding_candidates WHERE id = _candidate_id;
  IF _candidate IS NULL THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  -- Auth: caller must have access to this location
  IF NOT user_has_role_in_location(_user_id, _candidate.location_id, ARRAY['owner','manager']::location_role[]) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _candidate.status != 'active' THEN
    RAISE EXCEPTION 'Candidate is not active (status: %)', _candidate.status;
  END IF;

  IF _candidate.current_phase_id IS NULL THEN
    RAISE EXCEPTION 'Candidate has no current phase';
  END IF;

  -- Verify all tasks in current phase are done
  IF EXISTS (
    SELECT 1 FROM ob_tasks
    WHERE candidate_id = _candidate_id
      AND phase_id = _candidate.current_phase_id
      AND status NOT IN ('completed', 'skipped')
  ) THEN
    RAISE EXCEPTION 'Not all tasks in the current phase are completed';
  END IF;

  -- Get current phase
  SELECT * INTO _current_phase FROM onboarding_phases WHERE id = _candidate.current_phase_id;

  -- Find next phase
  SELECT * INTO _next_phase FROM onboarding_phases
  WHERE location_id = _candidate.location_id
    AND is_active = true
    AND sort_order > _current_phase.sort_order
  ORDER BY sort_order ASC LIMIT 1;

  IF _next_phase IS NULL THEN
    -- Last phase: hire the candidate
    UPDATE onboarding_candidates SET status = 'hired', updated_at = now() WHERE id = _candidate_id;

    UPDATE onboarding_phase_logs SET exited_at = now()
    WHERE candidate_id = _candidate_id AND phase_id = _current_phase.id AND exited_at IS NULL;

    INSERT INTO onboarding_events (candidate_id, location_id, event_type, event_data, triggered_by, actor_id)
    VALUES (_candidate_id, _candidate.location_id, 'hired',
      jsonb_build_object('final_phase_id', _current_phase.id, 'final_phase_name', _current_phase.name),
      'user', _user_id);

    _result := jsonb_build_object('action', 'hired', 'candidate_id', _candidate_id);
  ELSE
    -- Advance to next phase
    UPDATE onboarding_candidates SET current_phase_id = _next_phase.id, updated_at = now() WHERE id = _candidate_id;

    UPDATE onboarding_phase_logs SET exited_at = now()
    WHERE candidate_id = _candidate_id AND phase_id = _current_phase.id AND exited_at IS NULL;

    INSERT INTO onboarding_phase_logs (candidate_id, phase_id, entered_at, created_by)
    VALUES (_candidate_id, _next_phase.id, now(), _user_id);

    -- Generate tasks for next phase
    IF _next_phase.task_templates IS NOT NULL AND jsonb_array_length(_next_phase.task_templates) > 0 THEN
      FOR _task IN SELECT * FROM jsonb_array_elements(_next_phase.task_templates)
      LOOP
        _sort := _sort + 10;
        INSERT INTO ob_tasks (candidate_id, location_id, phase_id, title, description, assigned_role, is_automated, sort_order)
        VALUES (
          _candidate_id, _candidate.location_id, _next_phase.id,
          _task->>'title', _task->>'description',
          CASE WHEN _task->>'assigned_role' IS NOT NULL THEN (_task->>'assigned_role')::location_role ELSE NULL END,
          COALESCE((_task->>'is_automated')::boolean, false), _sort
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
