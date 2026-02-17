import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';

interface ExtendOptionParams {
  reservation_id: string;
  extra_hours?: number;
  actor_id?: string | null;
  // For cache invalidation
  location_id: string;
}

export function useExtendOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ExtendOptionParams) => {
      const { data, error } = await supabase.rpc('extend_option', {
        _reservation_id: params.reservation_id,
        _extra_hours: params.extra_hours ?? 24,
        _actor_id: params.actor_id ?? null,
      });

      if (error) throw error;
      return data as string; // new expiry timestamp
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reservation(params.reservation_id),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.reservations(params.location_id),
        exact: false,
      });
    },
  });
}
