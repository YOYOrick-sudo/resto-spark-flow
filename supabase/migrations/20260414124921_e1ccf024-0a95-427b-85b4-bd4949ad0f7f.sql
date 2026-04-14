-- Bereidingswijze en omschrijving kolommen toevoegen aan gerechten
ALTER TABLE gerechten ADD COLUMN IF NOT EXISTS bereidingswijze TEXT;
ALTER TABLE gerechten ADD COLUMN IF NOT EXISTS omschrijving TEXT;

-- Storage bucket voor gerecht foto's
INSERT INTO storage.buckets (id, name, public) VALUES ('gerecht-fotos', 'gerecht-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Location-scoped RLS policies voor gerecht-fotos bucket
CREATE POLICY "Users can upload gerecht fotos for own location"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'gerecht-fotos'
    AND (storage.foldername(name))[1] IN (
      SELECT location_id::text FROM user_location_roles
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own location gerecht fotos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'gerecht-fotos'
    AND (storage.foldername(name))[1] IN (
      SELECT location_id::text FROM user_location_roles
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete own location gerecht fotos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'gerecht-fotos'
    AND (storage.foldername(name))[1] IN (
      SELECT location_id::text FROM user_location_roles
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Anyone can view gerecht fotos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'gerecht-fotos');