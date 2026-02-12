import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { nestoToast } from '@/lib/nestoToast';

export function useDeletePhase() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (phaseId: string) => {
      const { count, error: countError } = await supabase
        .from('onboarding_candidates')
        .select('id', { count: 'exact', head: true })
        .eq('current_phase_id', phaseId)
        .eq('status', 'active');

      if (countError) throw countError;
      if ((count ?? 0) > 0) {
        throw new Error('Er zijn nog actieve kandidaten in deze fase. Verplaats ze eerst.');
      }

      const { error } = await supabase
        .from('onboarding_phases')
        .update({ is_active: false })
        .eq('id', phaseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-phases-all', locationId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-phases', locationId] });
      nestoToast.success('Fase verwijderd');
    },
    onError: (error: Error) => {
      nestoToast.error(error.message || 'Kon fase niet verwijderen');
    },
  });
}
