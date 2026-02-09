import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { Json } from '@/integrations/supabase/types';

interface PhaseUpdate {
  phaseId: string;
  updates: {
    is_active?: boolean;
    description?: string | null;
    task_templates?: Json;
  };
}

export function useUpdatePhaseConfig() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ phaseId, updates }: PhaseUpdate) => {
      const { error } = await supabase
        .from('onboarding_phases')
        .update(updates)
        .eq('id', phaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-phases-all', locationId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-phases', locationId] });
    },
  });
}
