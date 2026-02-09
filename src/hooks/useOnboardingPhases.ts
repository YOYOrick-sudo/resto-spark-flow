import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useOnboardingPhases(locationId: string | undefined) {
  return useQuery({
    queryKey: ['onboarding-phases', locationId],
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
