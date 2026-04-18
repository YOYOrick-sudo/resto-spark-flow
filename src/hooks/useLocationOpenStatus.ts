import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LocationOpenStatus {
  isOpen: boolean;
  isClosed: boolean;
  label: string | null;
  source: 'regular' | 'exception' | null;
}

/**
 * Geeft de open/gesloten status van een locatie voor een specifieke dag.
 * Gebruikt de centrale `get_operating_schedule` RPC zodat label en bron
 * (regulier vs exception zoals "Koningsdag") meekomen.
 *
 * Bedoeld voor UI-banners en knop-disable logica in modules zoals
 * Reserveringen, MEP-planning en Logboek.
 */
export function useLocationOpenStatus(
  locationId: string | undefined,
  date: string | undefined,
  service: string = 'general',
) {
  return useQuery({
    queryKey: ['location-open-status', locationId, date, service] as const,
    enabled: !!locationId && !!date,
    staleTime: 60_000,
    queryFn: async (): Promise<LocationOpenStatus> => {
      const { data, error } = await supabase.rpc('get_operating_schedule', {
        _location_id: locationId!,
        _from: date!,
        _to: date!,
        _service: service,
      });
      if (error) throw error;

      const rows = (data ?? []) as Array<{
        is_closed: boolean;
        label: string | null;
        source: 'regular' | 'exception';
      }>;

      const row = rows[0];
      if (!row) {
        return { isOpen: false, isClosed: true, label: null, source: null };
      }

      return {
        isOpen: !row.is_closed,
        isClosed: row.is_closed,
        label: row.label,
        source: row.source,
      };
    },
  });
}
