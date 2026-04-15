
-- 1. Medewerkers tabel
CREATE TABLE public.medewerkers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  naam VARCHAR(255) NOT NULL,
  rol VARCHAR(100),
  email VARCHAR(255),
  is_actief BOOLEAN DEFAULT true,
  laatst_actief TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, naam)
);
CREATE INDEX idx_medewerkers_location ON public.medewerkers(location_id);
CREATE INDEX idx_medewerkers_actief ON public.medewerkers(location_id, is_actief);

ALTER TABLE public.medewerkers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medewerkers_select" ON public.medewerkers FOR SELECT TO authenticated
  USING (location_id IN (SELECT ulr.location_id FROM public.user_location_roles ulr WHERE ulr.user_id = (SELECT auth.uid())));
CREATE POLICY "medewerkers_insert" ON public.medewerkers FOR INSERT TO authenticated
  WITH CHECK (location_id IN (SELECT ulr.location_id FROM public.user_location_roles ulr WHERE ulr.user_id = (SELECT auth.uid())));
CREATE POLICY "medewerkers_update" ON public.medewerkers FOR UPDATE TO authenticated
  USING (location_id IN (SELECT ulr.location_id FROM public.user_location_roles ulr WHERE ulr.user_id = (SELECT auth.uid())));
CREATE POLICY "medewerkers_delete" ON public.medewerkers FOR DELETE TO authenticated
  USING (location_id IN (SELECT ulr.location_id FROM public.user_location_roles ulr WHERE ulr.user_id = (SELECT auth.uid())));

-- 2. Printer configuraties tabel
CREATE TABLE public.printer_configuraties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  naam VARCHAR(255) NOT NULL DEFAULT 'Keuken printer',
  printer_type VARCHAR(50) NOT NULL DEFAULT 'zebra_zd421',
  print_bridge_url VARCHAR(255),
  printer_ip VARCHAR(50),
  printer_port INT DEFAULT 9100,
  label_breedte_mm INT DEFAULT 60,
  label_hoogte_mm INT DEFAULT 40,
  print_darkness INT DEFAULT 15,
  print_speed INT DEFAULT 4,
  is_actief BOOLEAN DEFAULT true,
  laatst_geprint TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, naam)
);

ALTER TABLE public.printer_configuraties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "printer_config_select" ON public.printer_configuraties FOR SELECT TO authenticated
  USING (location_id IN (SELECT ulr.location_id FROM public.user_location_roles ulr WHERE ulr.user_id = (SELECT auth.uid())));
CREATE POLICY "printer_config_insert" ON public.printer_configuraties FOR INSERT TO authenticated
  WITH CHECK (location_id IN (SELECT ulr.location_id FROM public.user_location_roles ulr WHERE ulr.user_id = (SELECT auth.uid())));
CREATE POLICY "printer_config_update" ON public.printer_configuraties FOR UPDATE TO authenticated
  USING (location_id IN (SELECT ulr.location_id FROM public.user_location_roles ulr WHERE ulr.user_id = (SELECT auth.uid())));
CREATE POLICY "printer_config_delete" ON public.printer_configuraties FOR DELETE TO authenticated
  USING (location_id IN (SELECT ulr.location_id FROM public.user_location_roles ulr WHERE ulr.user_id = (SELECT auth.uid())));

-- 3. Label templates tabel
CREATE TABLE public.label_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  naam VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  velden JSONB NOT NULL DEFAULT '[]',
  label_breedte_mm INT DEFAULT 60,
  label_hoogte_mm INT DEFAULT 40,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.label_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "label_templates_select" ON public.label_templates FOR SELECT TO authenticated
  USING (location_id IN (SELECT ulr.location_id FROM public.user_location_roles ulr WHERE ulr.user_id = (SELECT auth.uid())));
CREATE POLICY "label_templates_insert" ON public.label_templates FOR INSERT TO authenticated
  WITH CHECK (location_id IN (SELECT ulr.location_id FROM public.user_location_roles ulr WHERE ulr.user_id = (SELECT auth.uid())));
CREATE POLICY "label_templates_update" ON public.label_templates FOR UPDATE TO authenticated
  USING (location_id IN (SELECT ulr.location_id FROM public.user_location_roles ulr WHERE ulr.user_id = (SELECT auth.uid())));
CREATE POLICY "label_templates_delete" ON public.label_templates FOR DELETE TO authenticated
  USING (location_id IN (SELECT ulr.location_id FROM public.user_location_roles ulr WHERE ulr.user_id = (SELECT auth.uid())));

-- 4. Print logs tabel
CREATE TABLE public.print_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.label_templates(id),
  printer_id UUID REFERENCES public.printer_configuraties(id),
  medewerker_id UUID REFERENCES public.medewerkers(id),
  label_data JSONB NOT NULL,
  zpl_output TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_print_logs_location ON public.print_logs(location_id, created_at DESC);

ALTER TABLE public.print_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "print_logs_select" ON public.print_logs FOR SELECT TO authenticated
  USING (location_id IN (SELECT ulr.location_id FROM public.user_location_roles ulr WHERE ulr.user_id = (SELECT auth.uid())));
CREATE POLICY "print_logs_insert" ON public.print_logs FOR INSERT TO authenticated
  WITH CHECK (location_id IN (SELECT ulr.location_id FROM public.user_location_roles ulr WHERE ulr.user_id = (SELECT auth.uid())));

-- 5. ALTER bestaande tabellen
ALTER TABLE public.mep_task_completions ADD COLUMN IF NOT EXISTS kok_medewerker_id UUID REFERENCES public.medewerkers(id);
ALTER TABLE public.checklist_runs ADD COLUMN IF NOT EXISTS medewerker_id UUID REFERENCES public.medewerkers(id);

-- 6. Trigger voor updated_at op medewerkers
CREATE TRIGGER update_medewerkers_updated_at
  BEFORE UPDATE ON public.medewerkers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_printer_configuraties_updated_at
  BEFORE UPDATE ON public.printer_configuraties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
