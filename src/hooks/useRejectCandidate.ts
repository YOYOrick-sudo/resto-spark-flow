import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRejectCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ candidateId, userId, locationId }: {
      candidateId: string;
      userId: string;
      locationId: string;
    }) => {
      // 1. Set candidate to rejected (no rejected_at column exists)
      const { error: candidateError } = await supabase
        .from('onboarding_candidates')
        .update({ status: 'rejected' })
        .eq('id', candidateId);
      if (candidateError) throw candidateError;

      // 2. Skip all pending tasks
      const { error: tasksError } = await supabase
        .from('ob_tasks')
        .update({ status: 'skipped' })
        .eq('candidate_id', candidateId)
        .in('status', ['pending', 'in_progress']);
      if (tasksError) throw tasksError;

      // 3. Log event
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
      toast.success('Kandidaat afgewezen');
    },
    onError: (error) => {
      toast.error('Afwijzen mislukt', { description: error.message });
    },
  });
}
