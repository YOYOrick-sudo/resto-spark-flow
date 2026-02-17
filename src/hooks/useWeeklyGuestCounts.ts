import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { queryKeys } from '@/lib/queryKeys';

export interface DayGuestCount {
  date: string;   // e.g. "17 feb"
  day: string;    // e.g. "M"
  count: number;  // sum of party_size
}

const DAY_LABELS = ['Z', 'M', 'D', 'W', 'D', 'V', 'Z'];

export function useWeeklyGuestCounts() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery<DayGuestCount[]>({
    queryKey: [...queryKeys.reservations(locationId ?? ''), 'weekly-guests'],
    queryFn: async () => {
      if (!locationId) return [];

      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 6);

      const fmt = (d: Date) => d.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('reservations')
        .select('reservation_date, party_size, status')
        .eq('location_id', locationId)
        .gte('reservation_date', fmt(startDate))
        .lte('reservation_date', fmt(today))
        .neq('status', 'cancelled');

      if (error) throw error;

      // Build a map for all 7 days
      const map = new Map<string, number>();
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        map.set(fmt(d), 0);
      }

      for (const r of data ?? []) {
        const current = map.get(r.reservation_date) ?? 0;
        map.set(r.reservation_date, current + r.party_size);
      }

      const result: DayGuestCount[] = [];
      for (const [dateStr, count] of map) {
        const d = new Date(dateStr + 'T12:00:00');
        result.push({
          date: d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
          day: DAY_LABELS[d.getDay()],
          count,
        });
      }

      return result;
    },
    enabled: !!locationId,
  });
}
