import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

const SLUG_REGEX = /^[a-z0-9-]{3,50}$/;

export function useApplicationSlugAvailability(slug: string, currentId: string | undefined) {
  const [status, setStatus] = useState<SlugStatus>('idle');

  useEffect(() => {
    if (!slug) {
      setStatus('idle');
      return;
    }
    if (!SLUG_REGEX.test(slug)) {
      setStatus('invalid');
      return;
    }

    setStatus('checking');
    const t = setTimeout(async () => {
      let query = supabase
        .from('public_application_settings')
        .select('id', { count: 'exact', head: true })
        .eq('slug', slug);
      if (currentId) query = query.neq('id', currentId);
      const { count, error } = await query;
      if (error) {
        setStatus('idle');
        return;
      }
      setStatus((count ?? 0) > 0 ? 'taken' : 'available');
    }, 400);

    return () => clearTimeout(t);
  }, [slug, currentId]);

  return status;
}