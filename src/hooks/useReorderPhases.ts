import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export function useReorderPhases() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (phaseIds: string[]) => {
      // Update sort_order for each phase: 10, 20, 30...
      const updates = phaseIds.map((id, index) =>
        supabase
          .from('onboarding_phases')
          .update({ sort_order: (index + 1) * 10 })
          .eq('id', id)
      );
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-phases-all', locationId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-phases', locationId] });
    },
  });
}
