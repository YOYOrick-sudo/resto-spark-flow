import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

/**
 * Fetches ALL phases for the current location, including inactive ones.
 * Used by Settings UI to allow toggling phases on/off.
 */
export function useAllOnboardingPhases() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['onboarding-phases-all', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_phases')
        .select('*')
        .eq('location_id', locationId!)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!locationId,
  });
}
