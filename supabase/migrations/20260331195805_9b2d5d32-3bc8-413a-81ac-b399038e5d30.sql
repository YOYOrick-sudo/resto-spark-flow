
-- Add branding columns to locations table
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS brand_color_primary TEXT DEFAULT '#0F766E';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS brand_color_secondary TEXT DEFAULT '#F0FDFA';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS brand_color_accent TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS tone_of_voice TEXT DEFAULT 'informeel';
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS guest_greeting TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS description_short TEXT;

-- Create brand-assets storage bucket (public for widget/email access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload to their location folder
CREATE POLICY "Users can upload brand assets for their location"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND public.user_has_location_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- RLS: authenticated users can update their location's assets
CREATE POLICY "Users can update brand assets for their location"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND public.user_has_location_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- RLS: authenticated users can delete their location's assets
CREATE POLICY "Users can delete brand assets for their location"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'brand-assets'
  AND public.user_has_location_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- RLS: public read access (needed for emails and widget)
CREATE POLICY "Public can read brand assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'brand-assets');
