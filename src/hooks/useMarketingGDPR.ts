import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export interface GDPRStats {
  channel: string;
  opted_in: number;
  opted_out: number;
  total: number;
}

export function useGDPRStats() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['marketing-gdpr-stats', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_contact_preferences')
        .select('channel, opted_in')
        .eq('location_id', locationId!);
      if (error) throw error;

      // Aggregate client-side
      const stats: Record<string, GDPRStats> = {};
      for (const row of data ?? []) {
        if (!stats[row.channel]) {
          stats[row.channel] = { channel: row.channel, opted_in: 0, opted_out: 0, total: 0 };
        }
        stats[row.channel].total++;
        if (row.opted_in) stats[row.channel].opted_in++;
        else stats[row.channel].opted_out++;
      }

      return Object.values(stats);
    },
    enabled: !!locationId,
  });
}
