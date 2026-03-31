import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { useUpdateLocationBranding } from '@/hooks/useLocationBranding';
import { nestoToast } from '@/lib/nestoToast';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const MAX_SIZE = 2 * 1024 * 1024;
const BUCKET = 'brand-assets';

function extFromMime(mime: string) {
  if (mime === 'image/svg+xml') return 'svg';
  if (mime === 'image/png') return 'png';
  return 'jpg';
}

export function useBrandAssetUpload() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const updateBranding = useUpdateLocationBranding();
  const [isUploading, setIsUploading] = useState(false);

  const uploadAsset = async (file: File, assetType: 'logo' | 'hero') => {
    if (!locationId) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      nestoToast.error('Ongeldig bestandstype', 'Gebruik PNG, JPG of SVG.');
      return;
    }
    if (file.size > MAX_SIZE) {
      nestoToast.error('Bestand te groot', 'Maximaal 2 MB toegestaan.');
      return;
    }

    setIsUploading(true);
    try {
      const ext = extFromMime(file.type);
      const path = `${locationId}/${assetType}.${ext}`;

      // Remove existing files for this asset type
      const { data: existing } = await supabase.storage
        .from(BUCKET)
        .list(locationId, { limit: 20 });

      if (existing?.length) {
        const assetFiles = existing.filter((f) => f.name.startsWith(`${assetType}.`));
        if (assetFiles.length) {
          await supabase.storage
            .from(BUCKET)
            .remove(assetFiles.map((f) => `${locationId}/${f.name}`));
        }
      }

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const url = `${urlData.publicUrl}?t=${Date.now()}`;

      const field = assetType === 'logo' ? 'logo_url' : 'hero_image_url';
      await updateBranding.mutateAsync({ [field]: url });
      nestoToast.success(assetType === 'logo' ? 'Logo geüpload' : 'Sfeerbeeld geüpload');
    } catch {
      nestoToast.error('Upload mislukt', 'Probeer het opnieuw.');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteAsset = async (assetType: 'logo' | 'hero') => {
    if (!locationId) return;
    setIsUploading(true);
    try {
      const { data: existing } = await supabase.storage
        .from(BUCKET)
        .list(locationId, { limit: 20 });

      if (existing?.length) {
        const assetFiles = existing.filter((f) => f.name.startsWith(`${assetType}.`));
        if (assetFiles.length) {
          await supabase.storage
            .from(BUCKET)
            .remove(assetFiles.map((f) => `${locationId}/${f.name}`));
        }
      }

      const field = assetType === 'logo' ? 'logo_url' : 'hero_image_url';
      await updateBranding.mutateAsync({ [field]: null });
      nestoToast.success(assetType === 'logo' ? 'Logo verwijderd' : 'Sfeerbeeld verwijderd');
    } catch {
      nestoToast.error('Verwijderen mislukt', 'Probeer het opnieuw.');
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadAsset, deleteAsset, isUploading };
}
