
-- Make communication-assets bucket public so logos are accessible without auth
UPDATE storage.buckets 
SET public = true 
WHERE id = 'communication-assets';

-- Drop the existing authenticated-only SELECT policy
DROP POLICY IF EXISTS "Users can view communication assets for their location" ON storage.objects;

-- Create a public SELECT policy for this bucket
CREATE POLICY "Public read access for communication assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'communication-assets');
