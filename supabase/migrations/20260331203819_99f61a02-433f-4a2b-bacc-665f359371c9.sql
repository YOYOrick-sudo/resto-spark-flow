-- =============================================
-- Sprint E.1a: Messaging Database
-- =============================================

-- 1. conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  channel TEXT NOT NULL DEFAULT 'webchat',
  channel_contact_id TEXT,
  status TEXT DEFAULT 'active',
  handled_by TEXT DEFAULT 'ai',
  claimed_by UUID REFERENCES public.profiles(id),
  claimed_at TIMESTAMPTZ,
  service_window_expires_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  unread_count INT DEFAULT 0,
  reservation_id UUID REFERENCES public.reservations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_location ON public.conversations(location_id, status);
CREATE INDEX idx_conversations_customer ON public.conversations(customer_id);
CREATE INDEX idx_conversations_last_message ON public.conversations(location_id, last_message_at DESC);
CREATE INDEX idx_conversations_unread ON public.conversations(location_id, unread_count) WHERE unread_count > 0;

-- Validation triggers for conversations
CREATE OR REPLACE FUNCTION public.validate_conversation()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.channel NOT IN ('whatsapp', 'webchat', 'voice') THEN
    RAISE EXCEPTION 'Invalid channel: %', NEW.channel;
  END IF;
  IF NEW.status NOT IN ('active', 'closed', 'escalated') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.handled_by NOT IN ('ai', 'operator', 'hybrid') THEN
    RAISE EXCEPTION 'Invalid handled_by: %', NEW.handled_by;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_conversation
  BEFORE INSERT OR UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.validate_conversation();

CREATE TRIGGER set_updated_at_conversations
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own location conversations"
  ON public.conversations FOR SELECT
  USING (location_id IN (SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users update own location conversations"
  ON public.conversations FOR UPDATE
  USING (location_id IN (SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages conversations"
  ON public.conversations FOR ALL
  USING (true) WITH CHECK (true);

-- 2. messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'webchat',
  direction TEXT NOT NULL DEFAULT 'outbound',
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  content_rich JSONB,
  template_name TEXT,
  template_params JSONB,
  wa_message_id TEXT UNIQUE,
  wa_status TEXT,
  wa_error_code TEXT,
  is_ai_generated BOOLEAN DEFAULT false,
  reservation_id UUID REFERENCES public.reservations(id),
  sent_by UUID REFERENCES public.profiles(id),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);
CREATE INDEX idx_messages_wa_id ON public.messages(wa_message_id) WHERE wa_message_id IS NOT NULL;
CREATE INDEX idx_messages_location ON public.messages(location_id, created_at DESC);

-- Validation triggers for messages
CREATE OR REPLACE FUNCTION public.validate_message()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.channel NOT IN ('whatsapp', 'webchat', 'voice') THEN
    RAISE EXCEPTION 'Invalid channel: %', NEW.channel;
  END IF;
  IF NEW.direction NOT IN ('inbound', 'outbound') THEN
    RAISE EXCEPTION 'Invalid direction: %', NEW.direction;
  END IF;
  IF NEW.message_type NOT IN ('text', 'template', 'interactive', 'media', 'system') THEN
    RAISE EXCEPTION 'Invalid message_type: %', NEW.message_type;
  END IF;
  IF NEW.wa_status IS NOT NULL AND NEW.wa_status NOT IN ('sent', 'delivered', 'read', 'failed') THEN
    RAISE EXCEPTION 'Invalid wa_status: %', NEW.wa_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_message
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.validate_message();

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own location messages"
  ON public.messages FOR SELECT
  USING (location_id IN (SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users insert own location messages"
  ON public.messages FOR INSERT
  WITH CHECK (location_id IN (SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages messages"
  ON public.messages FOR ALL
  USING (true) WITH CHECK (true);

-- 3. message_templates table
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  language TEXT NOT NULL DEFAULT 'nl',
  subject TEXT,
  body TEXT NOT NULL,
  header JSONB,
  footer TEXT,
  buttons JSONB,
  wa_template_name TEXT,
  wa_category TEXT,
  wa_status TEXT DEFAULT 'pending',
  wa_template_id TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, template_key, channel, language)
);

CREATE OR REPLACE FUNCTION public.validate_message_template()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.channel NOT IN ('whatsapp', 'email') THEN
    RAISE EXCEPTION 'Invalid channel: %', NEW.channel;
  END IF;
  IF NEW.wa_category IS NOT NULL AND NEW.wa_category NOT IN ('utility', 'marketing', 'authentication') THEN
    RAISE EXCEPTION 'Invalid wa_category: %', NEW.wa_category;
  END IF;
  IF NEW.wa_status IS NOT NULL AND NEW.wa_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid wa_status: %', NEW.wa_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_message_template
  BEFORE INSERT OR UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.validate_message_template();

CREATE TRIGGER set_updated_at_message_templates
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own location templates"
  ON public.message_templates FOR SELECT
  USING (location_id IN (SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users manage own location templates"
  ON public.message_templates FOR ALL
  USING (location_id IN (SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()));

-- 4. messaging_config table
CREATE TABLE public.messaging_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL UNIQUE REFERENCES public.locations(id) ON DELETE CASCADE,
  ai_agent_enabled BOOLEAN DEFAULT false,
  greeting_message TEXT,
  escalation_message TEXT DEFAULT 'Een moment, ik schakel je door naar een collega.',
  personality_tone TEXT DEFAULT 'friendly',
  languages TEXT[] DEFAULT ARRAY['nl', 'en'],
  auto_modify_reservations BOOLEAN DEFAULT false,
  auto_cancel_reservations BOOLEAN DEFAULT false,
  large_party_threshold INT DEFAULT 8,
  active_window_start TIME DEFAULT '08:00',
  active_window_end TIME DEFAULT '00:00',
  outside_window_reply TEXT DEFAULT 'Bedankt voor je bericht! We reageren morgenochtend. Wil je een reservering maken? Dat kan altijd!',
  whatsapp_enabled BOOLEAN DEFAULT false,
  d360_api_key_encrypted TEXT,
  webchat_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_messaging_config
  BEFORE UPDATE ON public.messaging_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.messaging_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own location messaging config"
  ON public.messaging_config FOR SELECT
  USING (location_id IN (SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users update own location messaging config"
  ON public.messaging_config FOR UPDATE
  USING (location_id IN (SELECT location_id FROM public.user_location_roles WHERE user_id = auth.uid()));

-- 5. Column extensions
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS whatsapp_business_account_id TEXT;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT false;

-- 6. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;