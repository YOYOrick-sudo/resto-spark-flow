import { useQuery, keepPreviousData } from '@tanstack/react-query';
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
  /**
   * True wanneer we (nog) niet kunnen bepalen of de datum open/dicht is:
   * - eerste mount, data nog nooit geladen
   * - datum valt buiten de geladen [from..to] window (cached/previous data van een andere range)
   * Callers moeten geen "gesloten"-UI tonen als unknown=true.
   */
  unknown: boolean;
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
    // Houd vorige data zichtbaar tijdens refetch zodat de UI niet flikkert
    // bij dag-navigatie (dag → dag binnen window verandert queryKey niet,
    // maar als chef >rangeDays vooruit navigeert wel).
    placeholderData: keepPreviousData,
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

  // Bepaal de werkelijke window van de data die nu in cache zit. Dit kan
  // een ándere range zijn dan [fromDate..toDate] omdat keepPreviousData
  // de vorige resultaten teruggeeft tijdens het laden van een nieuwe range.
  const dataWindow = (() => {
    if (rawSchedule.length === 0) return null;
    let min = rawSchedule[0].date;
    let max = rawSchedule[0].date;
    for (const r of rawSchedule) {
      if (r.date < min) min = r.date;
      if (r.date > max) max = r.date;
    }
    return { min, max };
  })();

  // Eerste rij per dag (split-shifts: as long as one window is open we treat day as open)
  const byDate = new Map<string, ScheduleRow[]>();
  for (const row of rawSchedule) {
    if (!byDate.has(row.date)) byDate.set(row.date, []);
    byDate.get(row.date)!.push(row);
  }

  const isClosedOnDate = (date: string): ClosedInfo => {
    // 1) Geen data ooit geladen → unknown
    if (!query.data) {
      return { closed: false, label: null, unknown: true };
    }
    // 2) Datum buiten de werkelijk geladen window → unknown
    //    (voorkomt dat een verre datum als "gesloten" wordt geïnterpreteerd
    //    omdat er simpelweg nog geen rijen voor zijn opgehaald)
    if (!dataWindow || date < dataWindow.min || date > dataWindow.max) {
      return { closed: false, label: null, unknown: true };
    }
    const rows = byDate.get(date);
    if (!rows || rows.length === 0) {
      // Datum is binnen window maar geen rij → echt gesloten (RPC returned niets voor die dag)
      return { closed: true, label: null, unknown: false };
    }
    const anyOpen = rows.some((r) => !r.is_closed);
    if (anyOpen) return { closed: false, label: null, unknown: false };
    const labelRow = rows.find((r) => r.label) ?? rows[0];
    return { closed: true, label: labelRow.label, unknown: false };
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
