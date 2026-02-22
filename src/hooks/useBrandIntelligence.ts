import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export function useBrandIntelligence() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['brand-intelligence', locationId],
    queryFn: async () => {
      if (!locationId) return null;
      const { data, error } = await supabase
        .from('marketing_brand_intelligence')
        .select('*')
        .eq('location_id', locationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000,
  });
}
