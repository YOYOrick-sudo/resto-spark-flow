import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { useUpdateCommunicationSettings } from '@/hooks/useCommunicationSettings';
import { nestoToast } from '@/lib/nestoToast';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const BUCKET = 'communication-assets';

function extFromMime(mime: string) {
  if (mime === 'image/svg+xml') return 'svg';
  if (mime === 'image/png') return 'png';
  return 'jpg';
}

export function useLogoUpload() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const updateSettings = useUpdateCommunicationSettings();
  const [isUploading, setIsUploading] = useState(false);

  const uploadLogo = async (file: File) => {
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
      const path = `${locationId}/logo.${ext}`;

      // Remove any existing logo files first
      const { data: existing } = await supabase.storage
        .from(BUCKET)
        .list(locationId, { limit: 10 });

      if (existing?.length) {
        const logoFiles = existing.filter((f) => f.name.startsWith('logo.'));
        if (logoFiles.length) {
          await supabase.storage
            .from(BUCKET)
            .remove(logoFiles.map((f) => `${locationId}/${f.name}`));
        }
      }

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      // Add cache-bust param
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await updateSettings.mutateAsync({ logo_url: logoUrl });
      nestoToast.success('Logo geüpload');
    } catch {
      nestoToast.error('Upload mislukt', 'Probeer het opnieuw.');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteLogo = async () => {
    if (!locationId) return;

    setIsUploading(true);
    try {
      const { data: existing } = await supabase.storage
        .from(BUCKET)
        .list(locationId, { limit: 10 });

      if (existing?.length) {
        const logoFiles = existing.filter((f) => f.name.startsWith('logo.'));
        if (logoFiles.length) {
          await supabase.storage
            .from(BUCKET)
            .remove(logoFiles.map((f) => `${locationId}/${f.name}`));
        }
      }

      await updateSettings.mutateAsync({ logo_url: null });
      nestoToast.success('Logo verwijderd');
    } catch {
      nestoToast.error('Verwijderen mislukt', 'Probeer het opnieuw.');
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadLogo, deleteLogo, isUploading };
}
