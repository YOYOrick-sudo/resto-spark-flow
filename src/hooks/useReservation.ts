import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import type { Reservation } from '@/types/reservation';

export function useReservation(reservationId: string | null) {
  return useQuery<Reservation | null>({
    queryKey: queryKeys.reservation(reservationId ?? ''),
    queryFn: async () => {
      if (!reservationId) return null;

      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          customers:customer_id (id, first_name, last_name, email, phone_number, language, tags, notes, total_visits, total_no_shows, total_cancellations, first_visit_at, last_visit_at),
          shifts:shift_id (name),
          tickets:ticket_id (name),
          tables:table_id (display_label)
        `)
        .eq('id', reservationId)
        .single();

      if (error) throw error;

      const row = data as any;
      return {
        ...row,
        customer: row.customers
          ? { ...row.customers, location_id: row.location_id, created_at: row.created_at, updated_at: row.updated_at }
          : undefined,
        shift_name: row.shifts?.name,
        ticket_name: row.tickets?.name,
        table_label: row.tables?.display_label,
      } as Reservation;
    },
    enabled: !!reservationId,
  });
}
