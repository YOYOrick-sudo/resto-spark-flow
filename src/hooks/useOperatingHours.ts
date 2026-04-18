import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';

export interface OperatingDay {
  date: string;                // YYYY-MM-DD
  service_type: string;
  open_time: string | null;    // "HH:MM:SS" of null bij gesloten
  close_time: string | null;
  is_closed: boolean;
  label: string | null;
  source: 'regular' | 'exception';
}

export interface OperatingHoursForDay {
  open_time: string;
  close_time: string;
  exception_type: string | null;
  label: string | null;
}

/**
 * Range-query: alle effectieve tijdvakken voor [from..to].
 * Eén call per zichtbare periode (kalendar/jaaroverzicht).
 */
export function useOperatingHours(
  locationId: string | undefined,
  range: { from: string; to: string },
  service?: string
) {
  return useQuery({
    queryKey: queryKeys.operatingHours(locationId ?? '', range.from, range.to, service),
    enabled: !!locationId && !!range.from && !!range.to,
    staleTime: 60_000,
    queryFn: async (): Promise<OperatingDay[]> => {
      const { data, error } = await supabase.rpc('get_operating_schedule', {
        _location_id: locationId!,
        _from: range.from,
        _to: range.to,
        _service: service ?? null,
      });
      if (error) throw error;
      return (data ?? []) as OperatingDay[];
    },
  });
}

/**
 * Effectieve tijdvakken voor één specifieke dag (kan meerdere zijn bij split-shift).
 */
export function useOperatingHoursForDay(
  locationId: string | undefined,
  date: string | undefined,
  service: string = 'general'
) {
  return useQuery({
    queryKey: ['operating-hours-day', locationId, date, service] as const,
    enabled: !!locationId && !!date,
    staleTime: 60_000,
    queryFn: async (): Promise<OperatingHoursForDay[]> => {
      const { data, error } = await supabase.rpc('get_operating_hours', {
        _location_id: locationId!,
        _date: date!,
        _service: service,
      });
      if (error) throw error;
      return (data ?? []) as OperatingHoursForDay[];
    },
  });
}

/**
 * One-shot check: is locatie open op moment `at` voor service?
 * Geen cache — bedoeld voor mutaties/guards.
 */
export async function checkLocationOpen(
  locationId: string,
  at: Date = new Date(),
  service: string = 'general'
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_location_open', {
    _location_id: locationId,
    _at: at.toISOString(),
    _service: service,
  });
  if (error) throw error;
  return !!data;
}
