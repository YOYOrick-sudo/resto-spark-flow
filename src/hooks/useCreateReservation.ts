import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import type { ReservationStatus, ReservationChannel } from '@/types/reservation';

interface CreateReservationParams {
  location_id: string;
  customer_id: string;
  shift_id: string;
  ticket_id: string;
  reservation_date: string;
  start_time: string;
  party_size: number;
  channel?: ReservationChannel;
  table_id?: string | null;
  guest_notes?: string | null;
  internal_notes?: string | null;
  initial_status?: ReservationStatus;
  squeeze?: boolean;
  actor_id?: string | null;
}

export function useCreateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateReservationParams) => {
      const { data, error } = await supabase.rpc('create_reservation', {
        _location_id: params.location_id,
        _customer_id: params.customer_id,
        _shift_id: params.shift_id,
        _ticket_id: params.ticket_id,
        _reservation_date: params.reservation_date,
        _start_time: params.start_time,
        _party_size: params.party_size,
        _channel: params.channel ?? 'operator',
        _table_id: params.table_id ?? null,
        _guest_notes: params.guest_notes ?? null,
        _internal_notes: params.internal_notes ?? null,
        _initial_status: params.initial_status ?? 'confirmed',
        _squeeze: params.squeeze ?? false,
        _actor_id: params.actor_id ?? null,
      });

      if (error) throw error;
      return data as string; // reservation UUID
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reservations(params.location_id),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers(params.location_id),
        exact: false,
      });
    },
  });
}
