import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nestoToast } from '@/lib/nestoToast';

export function useAdvancePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ candidateId, userId }: { candidateId: string; userId: string }) => {
      const { data, error } = await supabase.rpc('advance_onboarding_phase', {
        _candidate_id: candidateId,
        _user_id: userId,
      });
      if (error) throw error;
      return data as { action: string; candidate_id: string; from_phase?: string; to_phase?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-events'] });

      if (data?.action === 'hired') {
        nestoToast.success('Kandidaat aangenomen!');
      } else if (data?.action === 'advanced') {
        nestoToast.success(`Doorgegaan naar fase: ${data.to_phase}`);
      }
    },
    onError: (error) => {
      nestoToast.error('Fase-overgang mislukt', error.message);
    },
  });
}
