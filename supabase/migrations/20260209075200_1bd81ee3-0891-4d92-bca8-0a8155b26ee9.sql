
-- =============================================
-- TABELLEN
-- =============================================

CREATE TABLE onboarding_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  task_templates JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_onboarding_phases_location ON onboarding_phases(location_id);

CREATE TABLE onboarding_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status onboarding_status NOT NULL DEFAULT 'active',
  current_phase_id UUID REFERENCES onboarding_phases(id),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_onboarding_candidates_email ON onboarding_candidates(location_id, LOWER(email));
CREATE INDEX idx_onboarding_candidates_location ON onboarding_candidates(location_id);
CREATE INDEX idx_onboarding_candidates_phase ON onboarding_candidates(current_phase_id);

CREATE TABLE onboarding_phase_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES onboarding_candidates(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES onboarding_phases(id) ON DELETE CASCADE,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exited_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID
);
CREATE INDEX idx_onboarding_phase_logs_candidate ON onboarding_phase_logs(candidate_id);

CREATE TABLE onboarding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  email_templates JSONB NOT NULL DEFAULT '{}'::jsonb,
  reminder_config JSONB NOT NULL DEFAULT '{"first_reminder_hours": 24, "second_reminder_hours": 48, "candidate_reminder_days": 3, "auto_no_response_days": 7}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_onboarding_settings_location UNIQUE (location_id)
);

CREATE TABLE ob_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES onboarding_candidates(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  phase_id UUID NOT NULL REFERENCES onboarding_phases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_role location_role,
  assigned_user_id UUID,
  is_automated BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ob_tasks_candidate ON ob_tasks(candidate_id, phase_id);
CREATE INDEX idx_ob_tasks_location ON ob_tasks(location_id);

CREATE TABLE onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES onboarding_candidates(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  triggered_by TEXT NOT NULL DEFAULT 'user',
  actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_onboarding_events_candidate ON onboarding_events(candidate_id, created_at DESC);

CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'processing',
  result JSONB,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_workflow_executions_started ON workflow_executions(started_at);

-- =============================================
-- RLS
-- =============================================

ALTER TABLE onboarding_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_phases_select_platform" ON onboarding_phases FOR SELECT USING (is_platform_user(auth.uid()));
CREATE POLICY "onboarding_phases_select_location" ON onboarding_phases FOR SELECT USING (user_has_location_access(auth.uid(), location_id));
CREATE POLICY "onboarding_phases_insert" ON onboarding_phases FOR INSERT WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));
CREATE POLICY "onboarding_phases_update" ON onboarding_phases FOR UPDATE USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));
CREATE POLICY "onboarding_phases_delete" ON onboarding_phases FOR DELETE USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

ALTER TABLE onboarding_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_candidates_select_platform" ON onboarding_candidates FOR SELECT USING (is_platform_user(auth.uid()));
CREATE POLICY "onboarding_candidates_select_location" ON onboarding_candidates FOR SELECT USING (user_has_location_access(auth.uid(), location_id));
CREATE POLICY "onboarding_candidates_insert" ON onboarding_candidates FOR INSERT WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));
CREATE POLICY "onboarding_candidates_update" ON onboarding_candidates FOR UPDATE USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));
CREATE POLICY "onboarding_candidates_delete" ON onboarding_candidates FOR DELETE USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

ALTER TABLE onboarding_phase_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_phase_logs_select_platform" ON onboarding_phase_logs FOR SELECT USING (is_platform_user(auth.uid()));
CREATE POLICY "onboarding_phase_logs_select_location" ON onboarding_phase_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM onboarding_candidates c WHERE c.id = onboarding_phase_logs.candidate_id AND user_has_location_access(auth.uid(), c.location_id)));
CREATE POLICY "onboarding_phase_logs_insert" ON onboarding_phase_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM onboarding_candidates c WHERE c.id = onboarding_phase_logs.candidate_id AND user_has_role_in_location(auth.uid(), c.location_id, ARRAY['owner','manager']::location_role[])));
CREATE POLICY "onboarding_phase_logs_update" ON onboarding_phase_logs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM onboarding_candidates c WHERE c.id = onboarding_phase_logs.candidate_id AND user_has_role_in_location(auth.uid(), c.location_id, ARRAY['owner','manager']::location_role[])));

ALTER TABLE onboarding_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_settings_select_platform" ON onboarding_settings FOR SELECT USING (is_platform_user(auth.uid()));
CREATE POLICY "onboarding_settings_select_location" ON onboarding_settings FOR SELECT USING (user_has_location_access(auth.uid(), location_id));
CREATE POLICY "onboarding_settings_manage" ON onboarding_settings FOR ALL USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

ALTER TABLE ob_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ob_tasks_select_platform" ON ob_tasks FOR SELECT USING (is_platform_user(auth.uid()));
CREATE POLICY "ob_tasks_select_location" ON ob_tasks FOR SELECT USING (user_has_location_access(auth.uid(), location_id));
CREATE POLICY "ob_tasks_insert" ON ob_tasks FOR INSERT WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));
CREATE POLICY "ob_tasks_update" ON ob_tasks FOR UPDATE USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));
CREATE POLICY "ob_tasks_delete" ON ob_tasks FOR DELETE USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner','manager']::location_role[]));

ALTER TABLE onboarding_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_events_select_platform" ON onboarding_events FOR SELECT USING (is_platform_user(auth.uid()));
CREATE POLICY "onboarding_events_select_location" ON onboarding_events FOR SELECT USING (user_has_location_access(auth.uid(), location_id));
CREATE POLICY "onboarding_events_insert" ON onboarding_events FOR INSERT WITH CHECK (user_has_location_access(auth.uid(), location_id));

ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_executions_select_admin" ON workflow_executions FOR SELECT USING (is_platform_admin(auth.uid()));

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER update_onboarding_phases_updated_at BEFORE UPDATE ON onboarding_phases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_candidates_updated_at BEFORE UPDATE ON onboarding_candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_settings_updated_at BEFORE UPDATE ON onboarding_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ob_tasks_updated_at BEFORE UPDATE ON ob_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: genereer taken bij nieuwe kandidaat
CREATE OR REPLACE FUNCTION generate_initial_onboarding_tasks()
RETURNS TRIGGER AS $$
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
      INSERT INTO ob_tasks (candidate_id, location_id, phase_id, title, description, assigned_role, is_automated, sort_order)
      VALUES (
        NEW.id, NEW.location_id, _first_phase.id,
        _task->>'title', _task->>'description',
        CASE WHEN _task->>'assigned_role' IS NOT NULL THEN (_task->>'assigned_role')::location_role ELSE NULL END,
        COALESCE((_task->>'is_automated')::boolean, false), _sort
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_generate_initial_onboarding_tasks
  AFTER INSERT ON onboarding_candidates FOR EACH ROW EXECUTE FUNCTION generate_initial_onboarding_tasks();

-- Trigger: fase-overgang bij alle taken compleet
CREATE OR REPLACE FUNCTION check_onboarding_phase_completion()
RETURNS TRIGGER AS $$
DECLARE
  _candidate RECORD;
  _current_phase RECORD;
  _next_phase RECORD;
  _total_tasks INTEGER;
  _done_tasks INTEGER;
  _task JSONB;
  _sort INTEGER := 0;
BEGIN
  IF NEW.status NOT IN ('completed', 'skipped') THEN RETURN NEW; END IF;

  SELECT * INTO _candidate FROM onboarding_candidates WHERE id = NEW.candidate_id;
  IF _candidate.status != 'active' OR _candidate.current_phase_id IS NULL THEN RETURN NEW; END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('completed', 'skipped'))
  INTO _total_tasks, _done_tasks
  FROM ob_tasks WHERE candidate_id = NEW.candidate_id AND phase_id = _candidate.current_phase_id;

  IF _total_tasks = 0 OR _total_tasks != _done_tasks THEN RETURN NEW; END IF;

  SELECT * INTO _current_phase FROM onboarding_phases WHERE id = _candidate.current_phase_id;

  SELECT * INTO _next_phase FROM onboarding_phases
  WHERE location_id = _candidate.location_id AND is_active = true AND sort_order > _current_phase.sort_order
  ORDER BY sort_order ASC LIMIT 1;

  IF _next_phase IS NULL THEN
    UPDATE onboarding_candidates SET status = 'hired', updated_at = now() WHERE id = NEW.candidate_id;
    INSERT INTO onboarding_events (candidate_id, location_id, event_type, event_data, triggered_by)
    VALUES (NEW.candidate_id, NEW.location_id, 'hired', jsonb_build_object('final_phase_id', _current_phase.id), 'system');
  ELSE
    UPDATE onboarding_candidates SET current_phase_id = _next_phase.id, updated_at = now() WHERE id = NEW.candidate_id;
    UPDATE onboarding_phase_logs SET exited_at = now() WHERE candidate_id = NEW.candidate_id AND phase_id = _current_phase.id AND exited_at IS NULL;
    INSERT INTO onboarding_phase_logs (candidate_id, phase_id, entered_at) VALUES (NEW.candidate_id, _next_phase.id, now());

    IF _next_phase.task_templates IS NOT NULL AND jsonb_array_length(_next_phase.task_templates) > 0 THEN
      FOR _task IN SELECT * FROM jsonb_array_elements(_next_phase.task_templates)
      LOOP
        _sort := _sort + 10;
        INSERT INTO ob_tasks (candidate_id, location_id, phase_id, title, description, assigned_role, is_automated, sort_order)
        VALUES (
          NEW.candidate_id, NEW.location_id, _next_phase.id,
          _task->>'title', _task->>'description',
          CASE WHEN _task->>'assigned_role' IS NOT NULL THEN (_task->>'assigned_role')::location_role ELSE NULL END,
          COALESCE((_task->>'is_automated')::boolean, false), _sort
        );
      END LOOP;
    END IF;

    INSERT INTO onboarding_events (candidate_id, location_id, event_type, event_data, triggered_by)
    VALUES (NEW.candidate_id, NEW.location_id, 'phase_advanced',
      jsonb_build_object('from_phase_id', _current_phase.id, 'to_phase_id', _next_phase.id), 'system');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_check_onboarding_phase_completion
  AFTER UPDATE OF status ON ob_tasks FOR EACH ROW EXECUTE FUNCTION check_onboarding_phase_completion();

-- =============================================
-- PERMISSIONS
-- =============================================

INSERT INTO permissions (key) VALUES
  ('onboarding.view'), ('onboarding.candidates.view'), ('onboarding.candidates.edit'),
  ('onboarding.phases.view'), ('onboarding.phases.edit'), ('onboarding.settings')
ON CONFLICT (key) DO NOTHING;

INSERT INTO permission_set_permissions (permission_set_id, permission_id)
SELECT ps.id, p.id
FROM permission_sets ps CROSS JOIN permissions p
WHERE ps.key IN ('owner_default', 'manager_default')
  AND p.key IN ('onboarding.view', 'onboarding.candidates.view', 'onboarding.candidates.edit',
                'onboarding.phases.view', 'onboarding.phases.edit', 'onboarding.settings')
ON CONFLICT DO NOTHING;

-- =============================================
-- SEED DATA
-- =============================================

INSERT INTO location_entitlements (location_id, module_key, enabled)
VALUES ('22222222-2222-2222-2222-222222222222', 'onboarding', true)
ON CONFLICT (location_id, module_key) DO NOTHING;

INSERT INTO onboarding_phases (location_id, name, description, sort_order, is_active, task_templates) VALUES
('22222222-2222-2222-2222-222222222222', 'Aanmelding ontvangen', 'Eerste contact en ontvangstbevestiging', 10, true,
  '[{"title": "Ontvangstbevestiging sturen", "assigned_role": null, "is_automated": true},{"title": "CV en motivatie beoordelen", "assigned_role": "manager", "is_automated": false}]'::jsonb),
('22222222-2222-2222-2222-222222222222', 'Screening', 'Aanvullende vragen en eerste selectie', 20, true,
  '[{"title": "Aanvullende vragen sturen", "assigned_role": null, "is_automated": true},{"title": "Antwoorden beoordelen", "assigned_role": "manager", "is_automated": false}]'::jsonb),
('22222222-2222-2222-2222-222222222222', 'Uitnodiging gesprek', 'Kennismakingsgesprek inplannen', 30, true,
  '[{"title": "Uitnodiging versturen", "assigned_role": "manager", "is_automated": false},{"title": "Gesprek bevestigen", "assigned_role": "manager", "is_automated": false}]'::jsonb),
('22222222-2222-2222-2222-222222222222', 'Gesprek', 'Kennismakingsgesprek voeren', 40, true,
  '[{"title": "Gesprek voeren", "assigned_role": "manager", "is_automated": false},{"title": "Evaluatie invullen", "assigned_role": "manager", "is_automated": false}]'::jsonb),
('22222222-2222-2222-2222-222222222222', 'Meeloopdag', 'Proefdag op de werkvloer', 50, true,
  '[{"title": "Meeloopdag inplannen", "assigned_role": "manager", "is_automated": false},{"title": "Team informeren", "assigned_role": "manager", "is_automated": false},{"title": "Meeloopdag evaluatie", "assigned_role": "manager", "is_automated": false}]'::jsonb),
('22222222-2222-2222-2222-222222222222', 'Beslissing', 'Go/no-go beslissing', 60, true,
  '[{"title": "Eindbeslissing nemen", "assigned_role": "owner", "is_automated": false},{"title": "Kandidaat informeren", "assigned_role": "manager", "is_automated": false}]'::jsonb),
('22222222-2222-2222-2222-222222222222', 'Aanbod', 'Contract en voorwaarden', 70, true,
  '[{"title": "Arbeidsvoorwaarden opstellen", "assigned_role": "owner", "is_automated": false},{"title": "Contract versturen", "assigned_role": null, "is_automated": true},{"title": "Getekend contract ontvangen", "assigned_role": "manager", "is_automated": false}]'::jsonb),
('22222222-2222-2222-2222-222222222222', 'Pre-boarding', 'Voorbereiding voor eerste werkdag', 80, true,
  '[{"title": "Welkomstmail sturen", "assigned_role": null, "is_automated": true},{"title": "Werkkleding regelen", "assigned_role": "manager", "is_automated": false},{"title": "Systeem-accounts aanmaken", "assigned_role": "manager", "is_automated": false}]'::jsonb),
('22222222-2222-2222-2222-222222222222', 'Eerste werkdag', 'Ontvangst en introductie', 90, true,
  '[{"title": "Rondleiding geven", "assigned_role": "manager", "is_automated": false},{"title": "Team voorstellen", "assigned_role": "manager", "is_automated": false},{"title": "Huisregels doornemen", "assigned_role": "manager", "is_automated": false}]'::jsonb),
('22222222-2222-2222-2222-222222222222', 'Inwerkperiode', 'Eerste weken begeleiding', 100, true,
  '[{"title": "Inwerkschema doorlopen", "assigned_role": "manager", "is_automated": false},{"title": "Evaluatie na 1 week", "assigned_role": "manager", "is_automated": false},{"title": "Evaluatie na 2 weken", "assigned_role": "manager", "is_automated": false}]'::jsonb);

INSERT INTO onboarding_settings (location_id, email_templates, reminder_config) VALUES
('22222222-2222-2222-2222-222222222222',
  '{"confirmation":{"subject":"Bedankt voor je aanmelding","html_body":"<p>Bedankt voor je interesse. We nemen je aanmelding zo snel mogelijk in behandeling.</p>"},"rejection":{"subject":"Update over je aanmelding","html_body":"<p>Helaas hebben we besloten om niet met je verder te gaan.</p>"},"interview_invite":{"subject":"Uitnodiging kennismakingsgesprek","html_body":"<p>We nodigen je graag uit voor een kennismakingsgesprek.</p>"},"welcome":{"subject":"Welkom bij het team!","html_body":"<p>Welkom! We kijken ernaar uit om met je samen te werken.</p>"}}'::jsonb,
  '{"first_reminder_hours": 24, "second_reminder_hours": 48, "candidate_reminder_days": 3, "auto_no_response_days": 7}'::jsonb
);
