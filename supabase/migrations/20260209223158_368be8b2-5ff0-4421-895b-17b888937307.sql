
-- ============================================
-- SIGNALS TABLE
-- ============================================
CREATE TABLE public.signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  location_id uuid NOT NULL REFERENCES public.locations(id),
  module text NOT NULL,
  signal_type text NOT NULL,
  kind text NOT NULL DEFAULT 'signal',
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  action_path text,
  payload jsonb DEFAULT '{}',
  dedup_key text NOT NULL,
  cooldown_until timestamptz,
  status text NOT NULL DEFAULT 'active',
  source_signal_ids uuid[],
  actionable boolean DEFAULT false,
  priority int DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  dismissed_by uuid REFERENCES public.profiles(id),
  dismissed_at timestamptz
);

-- Primary query index
CREATE INDEX idx_signals_location_status_created 
  ON public.signals (location_id, status, created_at DESC);

-- Dedup: partial unique index on active signals only
CREATE UNIQUE INDEX idx_signals_dedup_active 
  ON public.signals (dedup_key) WHERE status = 'active';

-- Cooldown check index
CREATE INDEX idx_signals_cooldown 
  ON public.signals (location_id, signal_type, cooldown_until);

-- Enable RLS
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

-- SELECT: location access + module enabled check
CREATE POLICY "Users can view signals for their location with enabled modules"
  ON public.signals FOR SELECT
  USING (
    public.user_has_location_access(auth.uid(), location_id)
    AND EXISTS (
      SELECT 1 FROM public.location_entitlements le
      WHERE le.location_id = signals.location_id
        AND le.enabled = true
        AND (
          (signals.module = 'reserveringen' AND le.module_key = 'reservations')
          OR (signals.module = 'keuken' AND le.module_key = 'kitchen')
          OR (signals.module = 'revenue' AND le.module_key = 'finance')
          OR (signals.module = 'onboarding' AND le.module_key = 'onboarding')
          OR (signals.module = 'configuratie' AND le.module_key = 'settings')
        )
    )
  );

-- UPDATE: dismiss only
CREATE POLICY "Users can dismiss signals at their location"
  ON public.signals FOR UPDATE
  USING (
    public.user_has_location_access(auth.uid(), location_id)
  )
  WITH CHECK (
    public.user_has_location_access(auth.uid(), location_id)
  );

-- No INSERT/DELETE for regular users (service role only)

-- ============================================
-- SIGNAL_PREFERENCES TABLE
-- ============================================
CREATE TABLE public.signal_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  location_id uuid NOT NULL REFERENCES public.locations(id),
  signal_type text NOT NULL,
  muted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, location_id, signal_type)
);

ALTER TABLE public.signal_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own signal preferences"
  ON public.signal_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own signal preferences"
  ON public.signal_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own signal preferences"
  ON public.signal_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own signal preferences"
  ON public.signal_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
