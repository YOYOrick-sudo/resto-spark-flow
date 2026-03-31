
-- ============================================
-- Sprint E.0: Agent Foundation Framework
-- 6 tables: agent_configurations, agent_actions, agent_feedback, knowledge_base, ai_logs, ai_cache
-- ============================================

-- 1. agent_configurations
CREATE TABLE public.agent_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  autonomy_level TEXT NOT NULL DEFAULT 'recommend',
  is_enabled BOOLEAN DEFAULT true,
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, task_key)
);

ALTER TABLE public.agent_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own location agent configs"
  ON public.agent_configurations FOR SELECT TO authenticated
  USING (location_id IN (
    SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users update own location agent configs"
  ON public.agent_configurations FOR UPDATE TO authenticated
  USING (location_id IN (
    SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users insert own location agent configs"
  ON public.agent_configurations FOR INSERT TO authenticated
  WITH CHECK (location_id IN (
    SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()
  ));

-- Validation trigger for autonomy_level
CREATE OR REPLACE FUNCTION public.validate_agent_configuration()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.autonomy_level NOT IN ('recommend', 'notify', 'autonomous') THEN
    RAISE EXCEPTION 'Invalid autonomy_level: %. Must be recommend, notify, or autonomous', NEW.autonomy_level;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_agent_configuration
  BEFORE INSERT OR UPDATE ON public.agent_configurations
  FOR EACH ROW EXECUTE FUNCTION public.validate_agent_configuration();

CREATE TRIGGER set_updated_at_agent_configurations
  BEFORE UPDATE ON public.agent_configurations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. agent_actions
CREATE TABLE public.agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  beschrijving TEXT,
  status VARCHAR(20) DEFAULT 'concept',
  referentie_type VARCHAR(50),
  referentie_id UUID,
  action_data JSONB,
  goedgekeurd_door UUID REFERENCES public.profiles(id),
  goedgekeurd_op TIMESTAMPTZ,
  verloopt_op TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_actions_status ON public.agent_actions(location_id, status);

ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own location agent actions"
  ON public.agent_actions FOR SELECT TO authenticated
  USING (location_id IN (
    SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users update own location agent actions"
  ON public.agent_actions FOR UPDATE TO authenticated
  USING (location_id IN (
    SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role inserts agent actions"
  ON public.agent_actions FOR INSERT
  WITH CHECK (true);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_agent_action_status()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('concept', 'goedgekeurd', 'uitgevoerd', 'afgewezen', 'verlopen') THEN
    RAISE EXCEPTION 'Invalid agent action status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_agent_action_status
  BEFORE INSERT OR UPDATE ON public.agent_actions
  FOR EACH ROW EXECUTE FUNCTION public.validate_agent_action_status();

-- 3. agent_feedback
CREATE TABLE public.agent_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  action_id UUID REFERENCES public.agent_actions(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL,
  correction_data JSONB,
  given_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.agent_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own location feedback"
  ON public.agent_feedback FOR SELECT TO authenticated
  USING (location_id IN (
    SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users insert own location feedback"
  ON public.agent_feedback FOR INSERT TO authenticated
  WITH CHECK (location_id IN (
    SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()
  ));

-- Validation trigger for feedback_type
CREATE OR REPLACE FUNCTION public.validate_agent_feedback_type()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.feedback_type NOT IN ('approved', 'rejected', 'corrected') THEN
    RAISE EXCEPTION 'Invalid feedback_type: %', NEW.feedback_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_agent_feedback_type
  BEFORE INSERT OR UPDATE ON public.agent_feedback
  FOR EACH ROW EXECUTE FUNCTION public.validate_agent_feedback_type();

-- 4. knowledge_base
CREATE TABLE public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  question TEXT,
  answer TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  is_active BOOLEAN DEFAULT true,
  hit_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own location knowledge"
  ON public.knowledge_base FOR SELECT TO authenticated
  USING (location_id IN (
    SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users manage own location knowledge"
  ON public.knowledge_base FOR ALL TO authenticated
  USING (location_id IN (
    SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()
  ));

-- Validation trigger for source
CREATE OR REPLACE FUNCTION public.validate_knowledge_base_source()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.source NOT IN ('manual', 'wizard', 'gap_detection', 'import') THEN
    RAISE EXCEPTION 'Invalid knowledge_base source: %', NEW.source;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_knowledge_base_source
  BEFORE INSERT OR UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.validate_knowledge_base_source();

CREATE TRIGGER set_updated_at_knowledge_base
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. ai_logs
CREATE TABLE public.ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INT,
  output_tokens INT,
  latency_ms INT,
  cost_usd NUMERIC(8,6),
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_logs_created ON public.ai_logs(created_at DESC);
CREATE INDEX idx_ai_logs_feature ON public.ai_logs(location_id, feature);

ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own location ai logs"
  ON public.ai_logs FOR SELECT TO authenticated
  USING (location_id IN (
    SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role inserts ai logs"
  ON public.ai_logs FOR INSERT
  WITH CHECK (true);

-- 6. ai_cache
CREATE TABLE public.ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  query_text TEXT NOT NULL,
  response JSONB NOT NULL,
  model TEXT NOT NULL,
  hit_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_cache_lookup ON public.ai_cache(location_id, feature, query_text);
CREATE INDEX idx_ai_cache_expiry ON public.ai_cache(expires_at);

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages ai cache"
  ON public.ai_cache FOR ALL
  WITH CHECK (true);
