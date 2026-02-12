
-- Create private storage bucket for communication assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'communication-assets',
  'communication-assets',
  false,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml']
);

-- SELECT: users with location access can view files in their location folder
CREATE POLICY "Users can view communication assets for their location"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'communication-assets'
  AND public.user_has_location_access(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- INSERT: owner/manager can upload
CREATE POLICY "Owners and managers can upload communication assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'communication-assets'
  AND public.user_has_role_in_location(
    auth.uid(),
    (storage.foldername(name))[1]::uuid,
    ARRAY['owner','manager']::public.location_role[]
  )
);

-- UPDATE: owner/manager can update
CREATE POLICY "Owners and managers can update communication assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'communication-assets'
  AND public.user_has_role_in_location(
    auth.uid(),
    (storage.foldername(name))[1]::uuid,
    ARRAY['owner','manager']::public.location_role[]
  )
);

-- DELETE: owner/manager can delete
CREATE POLICY "Owners and managers can delete communication assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'communication-assets'
  AND public.user_has_role_in_location(
    auth.uid(),
    (storage.foldername(name))[1]::uuid,
    ARRAY['owner','manager']::public.location_role[]
  )
);
