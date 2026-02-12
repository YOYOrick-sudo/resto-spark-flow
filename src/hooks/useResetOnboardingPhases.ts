import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { nestoToast } from '@/lib/nestoToast';

export function useResetOnboardingPhases() {
  const queryClient = useQueryClient();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useMutation({
    mutationFn: async () => {
      if (!locationId) throw new Error('No location selected');

      const { data, error } = await supabase.rpc('reset_onboarding_phases', {
        p_location_id: locationId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-phases'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['onboarding-phases-all'], exact: false });
      nestoToast.success('Pipeline hersteld naar standaardinstelling');
    },
    onError: (err: Error) => {
      nestoToast.error('Herstellen mislukt', err.message);
    },
  });
}
