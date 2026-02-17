import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import type { ReservationStatus } from '@/types/reservation';

interface TransitionParams {
  reservation_id: string;
  new_status: ReservationStatus;
  actor_id?: string | null;
  reason?: string | null;
  is_override?: boolean;
  // For cache invalidation
  location_id: string;
  customer_id?: string | null;
}

export function useTransitionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: TransitionParams) => {
      const { data, error } = await supabase.rpc('transition_reservation_status', {
        _reservation_id: params.reservation_id,
        _new_status: params.new_status,
        _actor_id: params.actor_id ?? null,
        _reason: params.reason ?? null,
        _is_override: params.is_override ?? false,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reservations(params.location_id),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.reservation(params.reservation_id),
        exact: false,
      });
      if (params.customer_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.customerReservations(params.customer_id),
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.customer(params.customer_id),
          exact: false,
        });
      }
    },
  });
}
