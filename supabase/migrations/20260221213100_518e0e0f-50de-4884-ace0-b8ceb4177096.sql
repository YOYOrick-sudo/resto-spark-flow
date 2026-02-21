
-- =============================================
-- MARKETING MODULE: DATABASE FOUNDATION
-- =============================================

-- 1. Add missing columns to customers
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS average_spend NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS birthday DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS dietary_preferences TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS favorite_items JSONB DEFAULT NULL;

-- 2. Add missing columns to locations
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS google_place_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tripadvisor_url TEXT DEFAULT NULL;

-- =============================================
-- 3. REMOVE OLD PERMISSIONS (campaigns.view, campaigns.edit)
-- =============================================

-- Remove permission_set_permissions mappings first
DELETE FROM permission_set_permissions WHERE permission_id IN (
  SELECT id FROM permissions WHERE key IN ('marketing.campaigns.view', 'marketing.campaigns.edit')
);

-- Remove the permissions themselves
DELETE FROM permissions WHERE key IN ('marketing.campaigns.view', 'marketing.campaigns.edit');

-- =============================================
-- 4. ADD NEW PERMISSIONS
-- =============================================

INSERT INTO permissions (key) VALUES
  ('marketing.manage'),
  ('marketing.publish'),
  ('marketing.analytics')
ON CONFLICT (key) DO NOTHING;

-- Map new permissions to owner_default
INSERT INTO permission_set_permissions (permission_set_id, permission_id)
SELECT 'dd2403ab-9a6a-4f07-a74c-da70793954b7'::uuid, id
FROM permissions WHERE key IN ('marketing.manage', 'marketing.publish', 'marketing.analytics')
ON CONFLICT DO NOTHING;

-- Map new permissions to manager_default
INSERT INTO permission_set_permissions (permission_set_id, permission_id)
SELECT 'b056d0c0-82b7-4f19-b19d-fec15d3e5690'::uuid, id
FROM permissions WHERE key IN ('marketing.manage', 'marketing.publish', 'marketing.analytics')
ON CONFLICT DO NOTHING;

-- Map marketing.view to service_default (if not already)
INSERT INTO permission_set_permissions (permission_set_id, permission_id)
SELECT '98d5f06f-80de-4eed-832a-1f48cffa9d1a'::uuid, id
FROM permissions WHERE key = 'marketing.view'
ON CONFLICT DO NOTHING;

-- =============================================
-- 5. MARKETING TABLES
-- =============================================

-- marketing_brand_kit
CREATE TABLE marketing_brand_kit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  font_heading TEXT,
  font_body TEXT,
  tone_of_voice TEXT DEFAULT 'friendly',
  tone_description TEXT,
  default_greeting TEXT,
  default_signature TEXT,
  social_handles JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id)
);

ALTER TABLE marketing_brand_kit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_kit_select" ON marketing_brand_kit FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));
CREATE POLICY "brand_kit_manage" ON marketing_brand_kit FOR INSERT
  WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
CREATE POLICY "brand_kit_update" ON marketing_brand_kit FOR UPDATE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
CREATE POLICY "brand_kit_delete" ON marketing_brand_kit FOR DELETE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

-- marketing_segments (before campaigns, because campaigns references it)
CREATE TABLE marketing_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filter_rules JSONB NOT NULL DEFAULT '{"conditions":[],"logic":"AND"}',
  is_dynamic BOOLEAN NOT NULL DEFAULT true,
  guest_count INTEGER DEFAULT 0,
  guest_count_updated_at TIMESTAMPTZ,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE marketing_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "segments_select" ON marketing_segments FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));
CREATE POLICY "segments_insert" ON marketing_segments FOR INSERT
  WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
CREATE POLICY "segments_update" ON marketing_segments FOR UPDATE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
CREATE POLICY "segments_delete" ON marketing_segments FOR DELETE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role])
    AND is_system = false);

-- marketing_templates (before campaigns)
CREATE TABLE marketing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL DEFAULT 'email',
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  content_html TEXT,
  content_text TEXT,
  thumbnail_url TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE marketing_templates ENABLE ROW LEVEL SECURITY;

-- Platform-wide templates (location_id IS NULL) readable by all authenticated
CREATE POLICY "templates_select" ON marketing_templates FOR SELECT
  USING (
    location_id IS NULL
    OR user_has_location_access(auth.uid(), location_id)
  );
CREATE POLICY "templates_insert" ON marketing_templates FOR INSERT
  WITH CHECK (
    location_id IS NOT NULL
    AND user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role])
  );
CREATE POLICY "templates_update" ON marketing_templates FOR UPDATE
  USING (
    location_id IS NOT NULL
    AND user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role])
  );
CREATE POLICY "templates_delete" ON marketing_templates FOR DELETE
  USING (
    location_id IS NOT NULL
    AND is_system = false
    AND user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role])
  );

-- marketing_campaigns
CREATE TABLE marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  campaign_type TEXT NOT NULL DEFAULT 'email',
  name TEXT NOT NULL,
  subject TEXT,
  content_html TEXT,
  content_text TEXT,
  content_social JSONB,
  segment_id UUID REFERENCES marketing_segments(id) ON DELETE SET NULL,
  segment_filter JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  sent_count INTEGER NOT NULL DEFAULT 0,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_event TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select" ON marketing_campaigns FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));
CREATE POLICY "campaigns_insert" ON marketing_campaigns FOR INSERT
  WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
CREATE POLICY "campaigns_update" ON marketing_campaigns FOR UPDATE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
CREATE POLICY "campaigns_delete" ON marketing_campaigns FOR DELETE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

-- marketing_automation_flows
CREATE TABLE marketing_automation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  flow_type TEXT NOT NULL DEFAULT 'custom',
  trigger_config JSONB NOT NULL DEFAULT '{}',
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  template_id UUID REFERENCES marketing_templates(id) ON DELETE SET NULL,
  stats JSONB NOT NULL DEFAULT '{"total_triggered":0,"total_sent":0,"total_converted":0}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE marketing_automation_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flows_select" ON marketing_automation_flows FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));
CREATE POLICY "flows_insert" ON marketing_automation_flows FOR INSERT
  WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
CREATE POLICY "flows_update" ON marketing_automation_flows FOR UPDATE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
CREATE POLICY "flows_delete" ON marketing_automation_flows FOR DELETE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

-- marketing_campaign_analytics
CREATE TABLE marketing_campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email',
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  opened_count INTEGER NOT NULL DEFAULT 0,
  clicked_count INTEGER NOT NULL DEFAULT 0,
  bounced_count INTEGER NOT NULL DEFAULT 0,
  unsubscribed_count INTEGER NOT NULL DEFAULT 0,
  reservations_attributed INTEGER NOT NULL DEFAULT 0,
  revenue_attributed NUMERIC NOT NULL DEFAULT 0,
  social_impressions INTEGER NOT NULL DEFAULT 0,
  social_reach INTEGER NOT NULL DEFAULT 0,
  social_engagement INTEGER NOT NULL DEFAULT 0,
  social_saves INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE marketing_campaign_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_select" ON marketing_campaign_analytics FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));
CREATE POLICY "analytics_insert" ON marketing_campaign_analytics FOR INSERT
  WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
CREATE POLICY "analytics_update" ON marketing_campaign_analytics FOR UPDATE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

-- marketing_contact_preferences (GDPR)
CREATE TABLE marketing_contact_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  opted_in BOOLEAN NOT NULL DEFAULT false,
  opted_in_at TIMESTAMPTZ,
  opted_out_at TIMESTAMPTZ,
  consent_source TEXT,
  double_opt_in_confirmed BOOLEAN NOT NULL DEFAULT false,
  double_opt_in_token TEXT,
  double_opt_in_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, location_id, channel)
);

ALTER TABLE marketing_contact_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_prefs_select" ON marketing_contact_preferences FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));
CREATE POLICY "contact_prefs_insert" ON marketing_contact_preferences FOR INSERT
  WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role, 'service'::location_role]));
CREATE POLICY "contact_prefs_update" ON marketing_contact_preferences FOR UPDATE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role, 'service'::location_role]));

-- cross_module_events
CREATE TABLE cross_module_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  source_module TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  consumed_by JSONB NOT NULL DEFAULT '[]',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cme_location_type ON cross_module_events(location_id, event_type);
CREATE INDEX idx_cme_expires ON cross_module_events(expires_at);

ALTER TABLE cross_module_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cme_select" ON cross_module_events FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));
CREATE POLICY "cme_insert" ON cross_module_events FOR INSERT
  WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
CREATE POLICY "cme_update" ON cross_module_events FOR UPDATE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

-- marketing_content_ideas
CREATE TABLE marketing_content_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  idea_type TEXT NOT NULL DEFAULT 'social_post',
  source TEXT NOT NULL DEFAULT 'calendar',
  source_event_id UUID REFERENCES cross_module_events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  suggested_content JSONB DEFAULT '{}',
  suggested_segment_id UUID REFERENCES marketing_segments(id) ON DELETE SET NULL,
  suggested_date DATE,
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'suggested',
  converted_to_campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE marketing_content_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ideas_select" ON marketing_content_ideas FOR SELECT
  USING (user_has_location_access(auth.uid(), location_id));
CREATE POLICY "ideas_insert" ON marketing_content_ideas FOR INSERT
  WITH CHECK (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
CREATE POLICY "ideas_update" ON marketing_content_ideas FOR UPDATE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));
CREATE POLICY "ideas_delete" ON marketing_content_ideas FOR DELETE
  USING (user_has_role_in_location(auth.uid(), location_id, ARRAY['owner'::location_role, 'manager'::location_role]));

-- =============================================
-- 6. UPDATED_AT TRIGGERS
-- =============================================

CREATE TRIGGER update_marketing_brand_kit_updated_at
  BEFORE UPDATE ON marketing_brand_kit
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_segments_updated_at
  BEFORE UPDATE ON marketing_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_templates_updated_at
  BEFORE UPDATE ON marketing_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_campaigns_updated_at
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_automation_flows_updated_at
  BEFORE UPDATE ON marketing_automation_flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_campaign_analytics_updated_at
  BEFORE UPDATE ON marketing_campaign_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_contact_preferences_updated_at
  BEFORE UPDATE ON marketing_contact_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 7. SEED DATA for location 22222222-...
-- =============================================

-- Default brand kit
INSERT INTO marketing_brand_kit (location_id) VALUES ('22222222-2222-2222-2222-222222222222');

-- System segments
INSERT INTO marketing_segments (location_id, name, description, filter_rules, is_system) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Nieuwe gasten', 'Gasten met 1 bezoek in de afgelopen 30 dagen',
   '{"conditions":[{"field":"total_visits","operator":"eq","value":1},{"field":"days_since_last_visit","operator":"lt","value":30}],"logic":"AND"}', true),
  ('22222222-2222-2222-2222-222222222222', 'Reguliere gasten', 'Gasten met 3 of meer bezoeken',
   '{"conditions":[{"field":"total_visits","operator":"gte","value":3}],"logic":"AND"}', true),
  ('22222222-2222-2222-2222-222222222222', 'VIP gasten', 'Gasten met VIP tag',
   '{"conditions":[{"field":"tags","operator":"contains","value":"vip"}],"logic":"AND"}', true),
  ('22222222-2222-2222-2222-222222222222', 'At-risk gasten', 'Gasten met 2+ bezoeken en 45+ dagen inactief',
   '{"conditions":[{"field":"total_visits","operator":"gte","value":2},{"field":"days_since_last_visit","operator":"gte","value":45}],"logic":"AND"}', true),
  ('22222222-2222-2222-2222-222222222222', 'Verloren gasten', 'Gasten met 90+ dagen inactiviteit',
   '{"conditions":[{"field":"days_since_last_visit","operator":"gte","value":90}],"logic":"AND"}', true),
  ('22222222-2222-2222-2222-222222222222', 'Verjaardagen deze maand', 'Gasten met verjaardag in de huidige maand',
   '{"conditions":[{"field":"birthday_month","operator":"eq","value":"current_month"}],"logic":"AND"}', true);

-- Default automation flows
INSERT INTO marketing_automation_flows (location_id, name, flow_type, trigger_config, steps, is_active) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Welkomst', 'welcome',
   '{"trigger":"first_reservation_completed"}',
   '[{"type":"delay","hours":2},{"type":"send_email","template":"welcome"}]', false),
  ('22222222-2222-2222-2222-222222222222', 'Verjaardag', 'birthday',
   '{"trigger":"birthday_upcoming","days_before":7}',
   '[{"type":"send_email","template":"birthday"}]', false),
  ('22222222-2222-2222-2222-222222222222', 'Win-back 30 dagen', 'winback_30d',
   '{"trigger":"days_since_last_visit","days":30}',
   '[{"type":"send_email","template":"winback_30d"}]', false),
  ('22222222-2222-2222-2222-222222222222', 'Win-back 60 dagen', 'winback_60d',
   '{"trigger":"days_since_last_visit","days":60}',
   '[{"type":"send_email","template":"winback_60d"}]', false),
  ('22222222-2222-2222-2222-222222222222', 'Win-back 90 dagen', 'winback_90d',
   '{"trigger":"days_since_last_visit","days":90}',
   '[{"type":"send_email","template":"winback_90d"}]', false),
  ('22222222-2222-2222-2222-222222222222', 'Post-visit review', 'post_visit',
   '{"trigger":"post_visit","hours_after":3}',
   '[{"type":"send_email","template":"review_request"}]', false);
