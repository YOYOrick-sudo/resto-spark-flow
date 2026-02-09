import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { queryKeys } from '@/lib/queryKeys';

export function useDismissSignal() {
  const { currentLocation, context } = useUserContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (signalId: string) => {
      if (!context) throw new Error('No user context');

      const { error } = await supabase
        .from('signals')
        .update({
          status: 'dismissed',
          dismissed_by: context.user_id,
          dismissed_at: new Date().toISOString(),
        })
        .eq('id', signalId);

      if (error) throw error;
    },
    onSuccess: () => {
      if (currentLocation) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.signals(currentLocation.id),
          exact: false,
        });
      }
    },
  });
}
