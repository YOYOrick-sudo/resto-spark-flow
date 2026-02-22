import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export interface TaggedPost {
  id: string;
  caption: string | null;
  media_url: string;
  media_type: string;
  timestamp: string;
  username: string;
  permalink: string;
}

export function useTaggedPosts() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['ugc-tagged-posts', locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('marketing-fetch-ugc', {
        body: { location_id: locationId },
      });

      if (error) throw error;
      return (data?.posts ?? []) as TaggedPost[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
