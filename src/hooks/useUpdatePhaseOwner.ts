import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';

interface PhaseOwnerUpdate {
  phaseId: string;
  phase_owner_id?: string | null;
  phase_owner_name?: string | null;
  phase_owner_email?: string | null;
}

export function useUpdatePhaseOwner() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ phaseId, ...ownerData }: PhaseOwnerUpdate) => {
      const { error } = await supabase
        .from('onboarding_phases')
        .update(ownerData)
        .eq('id', phaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-phases-all', locationId] });
      toast.success('Verantwoordelijke bijgewerkt');
    },
    onError: () => {
      toast.error('Kon verantwoordelijke niet bijwerken');
    },
  });
}
