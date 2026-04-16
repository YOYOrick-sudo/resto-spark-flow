-- 1. Rename cost_usd → cost_eur (Nesto is Europees)
ALTER TABLE ai_logs RENAME COLUMN cost_usd TO cost_eur;

-- 2. Voeg ontbrekende kolommen toe
ALTER TABLE ai_logs
  ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN was_fallback BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN duration_ms INTEGER;

-- 3. Maak location_id nullable (sommige calls hebben geen locatie-context)
ALTER TABLE ai_logs ALTER COLUMN location_id DROP NOT NULL;

-- 4. Indexes voor monitoring queries
CREATE INDEX idx_ai_logs_org_feature
  ON ai_logs(organization_id, feature, created_at DESC);
CREATE INDEX idx_ai_logs_fallback
  ON ai_logs(was_fallback)
  WHERE was_fallback = true;