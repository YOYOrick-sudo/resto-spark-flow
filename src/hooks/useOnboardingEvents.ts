import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useOnboardingEvents(candidateId: string | undefined) {
  return useQuery({
    queryKey: ['onboarding-events', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_events')
        .select('*')
        .eq('candidate_id', candidateId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!candidateId,
  });
}
