-- 1. Schema-uitbreiding checklist_templates
ALTER TABLE public.checklist_templates
  ADD COLUMN IF NOT EXISTS frequentie TEXT NOT NULL DEFAULT 'dagelijks',
  ADD COLUMN IF NOT EXISTS frequentie_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS default_time TIME NULL;

ALTER TABLE public.checklist_templates
  DROP CONSTRAINT IF EXISTS checklist_templates_frequentie_check;

ALTER TABLE public.checklist_templates
  ADD CONSTRAINT checklist_templates_frequentie_check
  CHECK (frequentie IN ('dagelijks','wekelijks','maandelijks','kwartaal','halfjaar','jaarlijks','custom'));

-- 2. Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('taken-referenties', 'taken-referenties', false, 5242880,
        ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policies storage.objects
DROP POLICY IF EXISTS "taken_ref_select" ON storage.objects;
CREATE POLICY "taken_ref_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'taken-referenties' 
         AND public.user_has_location_access(auth.uid(), ((storage.foldername(name))[1])::uuid));

DROP POLICY IF EXISTS "taken_ref_insert" ON storage.objects;
CREATE POLICY "taken_ref_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'taken-referenties'
              AND public.user_has_role_in_location(auth.uid(), ((storage.foldername(name))[1])::uuid,
                  ARRAY['owner'::location_role,'manager'::location_role]));

DROP POLICY IF EXISTS "taken_ref_update" ON storage.objects;
CREATE POLICY "taken_ref_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'taken-referenties'
         AND public.user_has_role_in_location(auth.uid(), ((storage.foldername(name))[1])::uuid,
             ARRAY['owner'::location_role,'manager'::location_role]));

DROP POLICY IF EXISTS "taken_ref_delete" ON storage.objects;
CREATE POLICY "taken_ref_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'taken-referenties'
         AND public.user_has_role_in_location(auth.uid(), ((storage.foldername(name))[1])::uuid,
             ARRAY['owner'::location_role,'manager'::location_role]));

-- 4. Run-generation functie
CREATE OR REPLACE FUNCTION public.generate_daily_checklist_runs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tpl RECORD;
  today DATE := CURRENT_DATE;
  is_due BOOLEAN;
BEGIN
  FOR tpl IN SELECT * FROM checklist_templates WHERE actief = true LOOP
    is_due := false;
    IF tpl.frequentie = 'dagelijks' THEN
      is_due := true;
    ELSIF tpl.frequentie = 'wekelijks' THEN
      is_due := EXTRACT(ISODOW FROM today)::int = ANY(
        ARRAY(SELECT jsonb_array_elements_text(tpl.frequentie_config->'weekdagen'))::int[]);
    ELSIF tpl.frequentie = 'maandelijks' THEN
      is_due := EXTRACT(DAY FROM today)::int = (tpl.frequentie_config->>'dag_van_maand')::int;
    ELSIF tpl.frequentie = 'kwartaal' THEN
      is_due := EXTRACT(MONTH FROM today)::int IN (1,4,7,10)
                AND EXTRACT(DAY FROM today)::int = (tpl.frequentie_config->>'dag')::int;
    ELSIF tpl.frequentie = 'halfjaar' THEN
      is_due := (EXTRACT(MONTH FROM today)::int = (tpl.frequentie_config->>'maand')::int
                 OR EXTRACT(MONTH FROM today)::int = ((tpl.frequentie_config->>'maand')::int + 5) % 12 + 1)
                AND EXTRACT(DAY FROM today)::int = (tpl.frequentie_config->>'dag')::int;
    ELSIF tpl.frequentie = 'jaarlijks' THEN
      is_due := EXTRACT(MONTH FROM today)::int = (tpl.frequentie_config->>'maand')::int
                AND EXTRACT(DAY FROM today)::int = (tpl.frequentie_config->>'dag')::int;
    ELSIF tpl.frequentie = 'custom' THEN
      is_due := (today - (tpl.frequentie_config->>'start_datum')::date) 
                % (tpl.frequentie_config->>'interval_dagen')::int = 0;
    END IF;

    IF is_due THEN
      INSERT INTO checklist_runs (location_id, template_id, datum, status)
      SELECT tpl.location_id, tpl.id, today, 'open'
      WHERE NOT EXISTS (
        SELECT 1 FROM checklist_runs
        WHERE template_id = tpl.id AND datum = today AND shift IS NULL
      );
    END IF;
  END LOOP;
END;
$$;