import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import type { Reservation } from '@/types/reservation';

export function useReservationsByCustomer(customerId: string | null) {
  return useQuery<Reservation[]>({
    queryKey: queryKeys.customerReservations(customerId ?? ''),
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          shifts:shift_id (name),
          tickets:ticket_id (name),
          tables:table_id (display_label)
        `)
        .eq('customer_id', customerId)
        .order('reservation_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((r: any) => ({
        ...r,
        shift_name: r.shifts?.name,
        ticket_name: r.tickets?.name,
        table_label: r.tables?.display_label,
      })) as Reservation[];
    },
    enabled: !!customerId,
  });
}
