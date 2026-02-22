
-- ============================================
-- Fase 4.11: Waitlist + Auto-Invites
-- 3 tabellen + validation triggers + RLS
-- ============================================

-- ============================================
-- 1. waitlist_settings (1 rij per locatie)
-- ============================================
CREATE TABLE public.waitlist_settings (
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE PRIMARY KEY,
  waitlist_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_invite_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_invite_delay_minutes INTEGER NOT NULL DEFAULT 5,
  invite_window_minutes INTEGER NOT NULL DEFAULT 30,
  max_parallel_invites INTEGER NOT NULL DEFAULT 1,
  priority_mode TEXT NOT NULL DEFAULT 'auto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger for priority_mode
CREATE OR REPLACE FUNCTION public.validate_waitlist_settings()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.priority_mode NOT IN ('auto', 'manual') THEN
    RAISE EXCEPTION 'Invalid priority_mode: must be auto or manual';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_waitlist_settings
  BEFORE INSERT OR UPDATE ON public.waitlist_settings
  FOR EACH ROW EXECUTE FUNCTION public.validate_waitlist_settings();

ALTER TABLE public.waitlist_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_settings_select" ON public.waitlist_settings
  FOR SELECT USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "waitlist_settings_insert" ON public.waitlist_settings
  FOR INSERT WITH CHECK (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "waitlist_settings_update" ON public.waitlist_settings
  FOR UPDATE USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "waitlist_settings_delete" ON public.waitlist_settings
  FOR DELETE USING (public.user_has_location_access(auth.uid(), location_id));

-- ============================================
-- 2. waitlist_entries
-- ============================================
CREATE TABLE public.waitlist_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  party_size INTEGER NOT NULL,
  preferred_time_from TIME,
  preferred_time_to TIME,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_waitlist_entry()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'invited', 'converted', 'expired', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid waitlist entry status: %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_waitlist_entry
  BEFORE INSERT OR UPDATE ON public.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_waitlist_entry();

-- Indexes
CREATE INDEX idx_waitlist_entries_location_date ON public.waitlist_entries(location_id, date);
CREATE INDEX idx_waitlist_entries_status ON public.waitlist_entries(status);

ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_entries_select" ON public.waitlist_entries
  FOR SELECT USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "waitlist_entries_insert" ON public.waitlist_entries
  FOR INSERT WITH CHECK (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "waitlist_entries_update" ON public.waitlist_entries
  FOR UPDATE USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "waitlist_entries_delete" ON public.waitlist_entries
  FOR DELETE USING (public.user_has_location_access(auth.uid(), location_id));

-- ============================================
-- 3. waitlist_invites
-- ============================================
CREATE TABLE public.waitlist_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  waitlist_entry_id UUID NOT NULL REFERENCES public.waitlist_entries(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  party_size INTEGER NOT NULL,
  invite_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'sent',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger for status
CREATE OR REPLACE FUNCTION public.validate_waitlist_invite()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('sent', 'accepted', 'expired', 'declined') THEN
    RAISE EXCEPTION 'Invalid waitlist invite status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_waitlist_invite
  BEFORE INSERT OR UPDATE ON public.waitlist_invites
  FOR EACH ROW EXECUTE FUNCTION public.validate_waitlist_invite();

-- Indexes
CREATE INDEX idx_waitlist_invites_token ON public.waitlist_invites(invite_token);
CREATE INDEX idx_waitlist_invites_entry ON public.waitlist_invites(waitlist_entry_id);
CREATE INDEX idx_waitlist_invites_expires ON public.waitlist_invites(status, expires_at) WHERE status = 'sent';

ALTER TABLE public.waitlist_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_invites_select" ON public.waitlist_invites
  FOR SELECT USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "waitlist_invites_insert" ON public.waitlist_invites
  FOR INSERT WITH CHECK (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "waitlist_invites_update" ON public.waitlist_invites
  FOR UPDATE USING (public.user_has_location_access(auth.uid(), location_id));

CREATE POLICY "waitlist_invites_delete" ON public.waitlist_invites
  FOR DELETE USING (public.user_has_location_access(auth.uid(), location_id));
