// Shared edge-function helper: Operating Hours checks
// Gebruikt door ai-respond, whatsapp-webhook, evaluate-signals, generate_daily_checklist_runs etc.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Is de locatie open op moment `isoTime`?
 *
 * Fail-open: bij DB-fout retourneren we `true` zodat consumenten nooit
 * per ongeluk een module stilleggen door een transient error.
 */
export async function isOpenAt(
  supabase: SupabaseClient,
  locationId: string,
  isoTime: string,
  service: string = 'general'
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_location_open', {
    _location_id: locationId,
    _at: isoTime,
    _service: service,
  });
  if (error) {
    console.error('[operating-hours] isOpenAt failed:', error.message);
    return true; // fail-open
  }
  return !!data;
}

export interface OperatingDayRow {
  date: string;
  service_type: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  label: string | null;
  source: 'regular' | 'exception';
}

/**
 * Schedule voor een datumbereik. Bedoeld voor cron-jobs en context-loaders
 * die in één call de week/maand willen weten (zonder N+1 calls).
 */
export async function getSchedule(
  supabase: SupabaseClient,
  locationId: string,
  from: string,
  to: string,
  service: string | null = null
): Promise<OperatingDayRow[]> {
  const { data, error } = await supabase.rpc('get_operating_schedule', {
    _location_id: locationId,
    _from: from,
    _to: to,
    _service: service,
  });
  if (error) {
    console.error('[operating-hours] getSchedule failed:', error.message);
    return [];
  }
  return (data ?? []) as OperatingDayRow[];
}
