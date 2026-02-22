import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { subDays } from 'date-fns';

/**
 * Fetches at-risk guest count for sidebar badge.
 * staleTime = 5 min to avoid re-fetching on every navigation.
 */
export function useMarketingBadge() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['marketing-badge', locationId],
    queryFn: async () => {
      const threshold = subDays(new Date(), 60).toISOString();
      const { data } = await supabase
        .from('customers')
        .select('id')
        .eq('location_id', locationId!)
        .lt('last_visit_at', threshold)
        .not('last_visit_at', 'is', null);

      return (data || []).length;
    },
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
