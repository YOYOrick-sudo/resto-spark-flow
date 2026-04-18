import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScheduleRow {
  date: string;                     // YYYY-MM-DD
  service_type: string;
  open_time: string | null;         // "HH:MM:SS"
  close_time: string | null;
  is_closed: boolean;
  label: string | null;
  source: 'regular' | 'exception';
}

export interface ClosedInfo {
  closed: boolean;
  label: string | null;
}

export interface NextOpenInfo {
  date: string;
  openTime: string | null;
  closeTime: string | null;
}

/**
 * Combineer-hook: één RPC-call voor [from..from+rangeDays] en geeft
 * helpers om closed-status te checken én de eerstvolgende open dag te
 * vinden. Vervangt useLocationOpenStatus + losse useNextOpenDate door
 * één geheugen-cache.
 *
 * Gebruik in: BestellingDetail (leverdatum), MepTaken (planning),
 * Reserveringen (admin walk-in), etc.
 */
export function useLocationScheduleRange(
  locationId: string | undefined,
  fromDate: string | undefined,
  rangeDays: number = 30,
  service: string = 'general',
) {
  const toDate = fromDate
    ? (() => {
        const d = new Date(`${fromDate}T00:00:00`);
        d.setDate(d.getDate() + rangeDays);
        return d.toISOString().slice(0, 10);
      })()
    : undefined;

  const query = useQuery({
    queryKey: ['location-schedule-range', locationId, fromDate, rangeDays, service] as const,
    enabled: !!locationId && !!fromDate && !!toDate,
    staleTime: 60_000,
    queryFn: async (): Promise<ScheduleRow[]> => {
      const { data, error } = await supabase.rpc('get_operating_schedule', {
        _location_id: locationId!,
        _from: fromDate!,
        _to: toDate!,
        _service: service,
      });
      if (error) throw error;
      return (data ?? []) as ScheduleRow[];
    },
  });

  const rawSchedule = query.data ?? [];

  // Eerste rij per dag (split-shifts: as long as one window is open we treat day as open)
  const byDate = new Map<string, ScheduleRow[]>();
  for (const row of rawSchedule) {
    if (!byDate.has(row.date)) byDate.set(row.date, []);
    byDate.get(row.date)!.push(row);
  }

  const isClosedOnDate = (date: string): ClosedInfo => {
    const rows = byDate.get(date);
    if (!rows || rows.length === 0) {
      return { closed: true, label: null };
    }
    const anyOpen = rows.some((r) => !r.is_closed);
    if (anyOpen) return { closed: false, label: null };
    const labelRow = rows.find((r) => r.label) ?? rows[0];
    return { closed: true, label: labelRow.label };
  };

  const findNextOpenDate = (from: string): NextOpenInfo | null => {
    const sortedDates = Array.from(byDate.keys()).sort();
    for (const d of sortedDates) {
      if (d <= from) continue;
      const rows = byDate.get(d)!;
      const openRow = rows.find((r) => !r.is_closed);
      if (openRow) {
        return { date: d, openTime: openRow.open_time, closeTime: openRow.close_time };
      }
    }
    return null;
  };

  return {
    ...query,
    rawSchedule,
    isClosedOnDate,
    findNextOpenDate,
  };
}
