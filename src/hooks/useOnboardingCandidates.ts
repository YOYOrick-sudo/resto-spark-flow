import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useOnboardingCandidates(locationId: string | undefined) {
  return useQuery({
    queryKey: ['onboarding-candidates', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_candidates')
        .select(`
          *,
          current_phase:onboarding_phases!current_phase_id (
            id, name, sort_order
          )
        `)
        .eq('location_id', locationId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!locationId,
  });
}
