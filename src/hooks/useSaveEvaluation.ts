import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nestoToast } from '@/lib/nestoToast';

export function useSaveEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ candidateId, evaluation, userId, locationId }: {
      candidateId: string;
      evaluation: { rating: number; notes: string; recommendation: string };
      userId: string;
      locationId: string;
    }) => {
      const { error } = await supabase
        .from('onboarding_events')
        .insert({
          candidate_id: candidateId,
          location_id: locationId,
          event_type: 'evaluation_saved',
          event_data: evaluation,
          triggered_by: 'user',
          actor_id: userId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-events'] });
      nestoToast.success('Evaluatie opgeslagen');
    },
    onError: (error) => {
      nestoToast.error('Evaluatie opslaan mislukt', error.message);
    },
  });
}
