import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nestoToast } from '@/lib/nestoToast';

export function useRejectCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ candidateId, userId, locationId }: {
      candidateId: string;
      userId: string;
      locationId: string;
    }) => {
      const { error: candidateError } = await supabase
        .from('onboarding_candidates')
        .update({ status: 'rejected' })
        .eq('id', candidateId);
      if (candidateError) throw candidateError;

      const { error: tasksError } = await supabase
        .from('ob_tasks')
        .update({ status: 'skipped' })
        .eq('candidate_id', candidateId)
        .in('status', ['pending', 'in_progress']);
      if (tasksError) throw tasksError;

      const { error: eventError } = await supabase
        .from('onboarding_events')
        .insert({
          candidate_id: candidateId,
          location_id: locationId,
          event_type: 'rejected',
          event_data: {},
          triggered_by: 'user',
          actor_id: userId,
        });
      if (eventError) throw eventError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-events'] });
      nestoToast.success('Kandidaat afgewezen');
    },
    onError: (error) => {
      nestoToast.error('Afwijzen mislukt', error.message);
    },
  });
}
