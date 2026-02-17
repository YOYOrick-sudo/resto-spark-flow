import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import type { Reservation, ReservationStatus } from '@/types/reservation';

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

    onMutate: async (params) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({
        queryKey: ['reservations', params.location_id],
      });

      // Snapshot all matching reservation-list queries
      const snapshots = queryClient.getQueriesData<Reservation[]>({
        queryKey: ['reservations', params.location_id],
      });

      // Optimistically update status in every cached list
      for (const [key] of snapshots) {
        queryClient.setQueryData<Reservation[]>(key, (old) =>
          old?.map((r) =>
            r.id === params.reservation_id
              ? {
                  ...r,
                  status: params.new_status,
                  ...(params.new_status === 'seated'
                    ? { checked_in_at: new Date().toISOString() }
                    : {}),
                  ...(params.new_status === 'confirmed'
                    ? { checked_in_at: null }
                    : {}),
                }
              : r,
          ),
        );
      }

      return { snapshots };
    },

    onError: (_err, params, context) => {
      // Rollback to snapshots
      if (context?.snapshots) {
        for (const [key, data] of context.snapshots) {
          queryClient.setQueryData(key, data);
        }
      }
    },

    onSettled: (_, __, params) => {
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
