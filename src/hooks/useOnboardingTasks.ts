import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useOnboardingTasks(candidateId: string | undefined) {
  return useQuery({
    queryKey: ['onboarding-tasks', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ob_tasks')
        .select(`
          *,
          phase:onboarding_phases!phase_id (
            id, name, sort_order
          )
        `)
        .eq('candidate_id', candidateId!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!candidateId,
  });
}
