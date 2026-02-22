import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { nestoToast } from '@/lib/nestoToast';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 4;

export function useSocialMediaUpload() {
  const { currentLocation } = useUserContext();
  const [uploading, setUploading] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  const validateFiles = useCallback((files: File[]): File[] => {
    const currentCount = mediaUrls.length;
    const remaining = MAX_FILES - currentCount;

    if (remaining <= 0) {
      nestoToast.error(`Maximaal ${MAX_FILES} afbeeldingen per post`);
      return [];
    }

    const valid: File[] = [];
    for (const file of files.slice(0, remaining)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        nestoToast.error(`${file.name}: alleen PNG, JPG of WebP`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        nestoToast.error(`${file.name}: maximaal 5 MB`);
        continue;
      }
      valid.push(file);
    }

    if (files.length > remaining) {
      nestoToast.error(`Maximaal ${MAX_FILES} afbeeldingen — ${files.length - remaining} overgeslagen`);
    }

    return valid;
  }, [mediaUrls.length]);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!currentLocation) {
      nestoToast.error('Geen locatie geselecteerd');
      return;
    }

    const validated = validateFiles(files);
    if (validated.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of validated) {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${currentLocation.id}/social/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error } = await supabase.storage
          .from('communication-assets')
          .upload(path, file, { contentType: file.type, upsert: false });

        if (error) {
          nestoToast.error(`Upload mislukt: ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('communication-assets')
          .getPublicUrl(path);

        newUrls.push(urlData.publicUrl);
      }

      if (newUrls.length > 0) {
        setMediaUrls((prev) => [...prev, ...newUrls]);
      }
    } finally {
      setUploading(false);
    }
  }, [currentLocation, validateFiles]);

  const removeMedia = useCallback((url: string) => {
    setMediaUrls((prev) => prev.filter((u) => u !== url));
  }, []);

  const resetMedia = useCallback(() => {
    setMediaUrls([]);
  }, []);

  return { mediaUrls, uploading, uploadFiles, removeMedia, resetMedia, setMediaUrls };
}
