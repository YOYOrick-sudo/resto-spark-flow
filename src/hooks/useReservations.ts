import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { queryKeys } from '@/lib/queryKeys';
import type { Reservation } from '@/types/reservation';

interface UseReservationsParams {
  date?: string; // YYYY-MM-DD
}

export function useReservations({ date }: UseReservationsParams = {}) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery<Reservation[]>({
    queryKey: queryKeys.reservations(locationId ?? '', date),
    queryFn: async () => {
      if (!locationId) return [];

      let query = supabase
        .from('reservations')
        .select(`
          *,
          customers:customer_id (id, first_name, last_name, email, phone_number, total_visits, total_no_shows),
          shifts:shift_id (name),
          tickets:ticket_id (name),
          tables:table_id (display_label)
        `)
        .eq('location_id', locationId)
        .order('start_time', { ascending: true });

      if (date) {
        query = query.eq('reservation_date', date);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((r: any) => ({
        ...r,
        customer: r.customers ?? undefined,
        shift_name: r.shifts?.name,
        ticket_name: r.tickets?.name,
        table_label: r.tables?.display_label,
      })) as Reservation[];
    },
    enabled: !!locationId,
  });
}
