import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// Types
// ============================================

export interface AvailabilityRequest {
  location_id: string;
  date: string;            // YYYY-MM-DD
  party_size: number;
  ticket_id?: string | null;
  channel?: 'widget' | 'operator' | 'google' | 'whatsapp';
  overbooking_covers?: number;
}

export type ReasonCode =
  | 'shift_closed'
  | 'booking_window'
  | 'party_size'
  | 'channel_blocked'
  | 'pacing_full'
  | 'max_covers'
  | 'tables_full';

export type SlotType = 'normal' | 'squeeze';

export interface SlotResult {
  time: string;
  available: boolean;
  slot_type: SlotType | null;
  reason_code: ReasonCode | null;
  ticket_id: string;
  ticket_name: string;
  duration_minutes: number;
}

export interface ShiftResult {
  shift_id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  slots: SlotResult[];
}

export interface AvailabilityResponse {
  shifts: ShiftResult[];
}

export interface EffectiveShift {
  shift_id: string;
  shift_name: string;
  short_name: string;
  start_time: string;      // "HH:MM:SS"
  end_time: string;
  arrival_interval_minutes: number;
  color: string;
  status: string;
  exception_label: string | null;
}

export interface TicketData {
  id: string;
  name: string;
  display_title: string;
  is_default: boolean;
  min_party_size: number;
  max_party_size: number;
  duration_minutes: number;
  buffer_minutes: number;
  booking_window_min_minutes: number | null;
  booking_window_max_days: number | null;
  large_party_threshold: number | null;
  large_party_min_minutes: number | null;
  squeeze_enabled: boolean;
  squeeze_duration_minutes: number | null;
  squeeze_gap_minutes: number;
  squeeze_to_fixed_end_time: string | null;
  squeeze_limit_per_shift: number | null;
}

export interface ShiftTicketConfig {
  shift_id: string;
  ticket_id: string;
  ticket_name: string;
  display_title: string;
  duration_minutes: number;
  buffer_minutes: number;
  min_party_size: number;
  max_party_size: number;
  pacing_limit: number | null;
  seating_limit_guests: number | null;
  seating_limit_reservations: number | null;
  ignore_pacing: boolean;
  areas: string[] | null;
  show_area_name: boolean;
  area_display_names: Record<string, string> | null;
  squeeze_enabled: boolean;
  squeeze_duration_minutes: number | null;
  squeeze_gap_minutes: number | null;
  squeeze_to_fixed_end_time: string | null;
  squeeze_limit_per_shift: number | null;
  show_end_time: boolean;
  waitlist_enabled: boolean;
  channel_permissions: { widget: boolean; phone: boolean; google?: boolean };
  policy_set_id: string | null;
}

export interface TableData {
  id: string;
  area_id: string;
  min_capacity: number;
  max_capacity: number;
  is_active: boolean;
  is_online_bookable: boolean;
}

export interface TableGroupData {
  id: string;
  combined_min_capacity: number;
  combined_max_capacity: number;
  is_active: boolean;
  is_online_bookable: boolean;
  member_table_ids: string[];
}

export interface ExistingReservation {
  id: string;
  shift_id: string;
  ticket_id: string;
  table_id: string | null;
  table_group_id: string | null;
  start_time: string;
  end_time: string;
  party_size: number;
  is_squeeze: boolean;
}

export interface EngineData {
  shifts: EffectiveShift[];
  shiftTicketConfigs: Map<string, ShiftTicketConfig[]>;
  tickets: Map<string, TicketData>;
  tables: TableData[];
  tableGroups: TableGroupData[];
  reservations: ExistingReservation[];
  locationTimezone: string;
}

// ============================================
// Time Helpers
// ============================================

/** Parse "HH:MM:SS" or "HH:MM" to minutes since midnight */
export function timeToMinutes(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

/** Minutes since midnight to "HH:MM" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Generate arrival slots between start and end at given interval */
export function generateSlotTimes(startTime: string, endTime: string, intervalMinutes: number): string[] {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const slots: string[] = [];
  for (let t = start; t < end; t += intervalMinutes) {
    slots.push(minutesToTime(t));
  }
  return slots;
}

/** Get current time in location timezone as minutes since midnight, and days advance */
export function getNowInTimezone(timezone: string, targetDate: string): { nowMinutes: number; advanceDays: number; advanceMinutes: (slotMinutes: number) => number } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const nowYear = parseInt(parts.find(p => p.type === 'year')!.value);
  const nowMonth = parseInt(parts.find(p => p.type === 'month')!.value);
  const nowDay = parseInt(parts.find(p => p.type === 'day')!.value);
  const nowHour = parseInt(parts.find(p => p.type === 'hour')!.value);
  const nowMinute = parseInt(parts.find(p => p.type === 'minute')!.value);

  const nowMinutes = nowHour * 60 + nowMinute;

  const [targetYear, targetMonth, targetDay] = targetDate.split('-').map(Number);
  const nowDate = new Date(nowYear, nowMonth - 1, nowDay);
  const target = new Date(targetYear, targetMonth - 1, targetDay);
  const advanceDays = Math.floor((target.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));

  const advanceMinutes = (slotMinutes: number): number => {
    return advanceDays * 24 * 60 + (slotMinutes - nowMinutes);
  };

  return { nowMinutes, advanceDays, advanceMinutes };
}

// ============================================
// Ticket Mapper
// ============================================

export function mapTicket(t: any): TicketData {
  return {
    id: t.id,
    name: t.name,
    display_title: t.display_title,
    is_default: t.is_default,
    min_party_size: t.min_party_size,
    max_party_size: t.max_party_size,
    duration_minutes: t.duration_minutes,
    buffer_minutes: t.buffer_minutes,
    booking_window_min_minutes: t.booking_window_min_minutes,
    booking_window_max_days: t.booking_window_max_days,
    large_party_threshold: t.large_party_threshold,
    large_party_min_minutes: t.large_party_min_minutes,
    squeeze_enabled: t.squeeze_enabled ?? false,
    squeeze_duration_minutes: t.squeeze_duration_minutes,
    squeeze_gap_minutes: t.squeeze_gap_minutes ?? 0,
    squeeze_to_fixed_end_time: t.squeeze_to_fixed_end_time,
    squeeze_limit_per_shift: t.squeeze_limit_per_shift,
  };
}

// ============================================
// Data Loader
// ============================================

export async function loadEngineData(
  supabase: ReturnType<typeof createClient>,
  req: AvailabilityRequest
): Promise<EngineData> {
  // 1. Get location timezone
  const { data: locData, error: locErr } = await supabase
    .from('locations')
    .select('timezone')
    .eq('id', req.location_id)
    .single();
  if (locErr) throw new Error(`Location query error: ${locErr.message}`);

  // 2. Build effective shift schedule (inline, bypassing RPC auth check)
  const targetDate = req.date;
  const dow = new Date(targetDate + 'T12:00:00Z').getUTCDay();
  const isoDow = dow === 0 ? 7 : dow;

  // Check location-wide closed exception
  const { data: locClosed } = await supabase
    .from('shift_exceptions')
    .select('id')
    .eq('location_id', req.location_id)
    .is('shift_id', null)
    .eq('exception_date', targetDate)
    .eq('exception_type', 'closed')
    .limit(1);

  if (locClosed && locClosed.length > 0) {
    return {
      shifts: [],
      shiftTicketConfigs: new Map(),
      tickets: new Map(),
      tables: [],
      tableGroups: [],
      reservations: [],
      locationTimezone: locData.timezone,
    };
  }

  // Get active shifts for this day-of-week
  const { data: rawShifts, error: shiftErr } = await supabase
    .from('shifts')
    .select('*')
    .eq('location_id', req.location_id)
    .eq('is_active', true)
    .contains('days_of_week', [isoDow])
    .order('sort_order');
  if (shiftErr) throw new Error(`Shifts query error: ${shiftErr.message}`);

  // Get shift exceptions for this date
  const shiftIds = (rawShifts || []).map((s: any) => s.id);
  let exceptions: any[] = [];
  if (shiftIds.length > 0) {
    const { data: excs } = await supabase
      .from('shift_exceptions')
      .select('*')
      .eq('location_id', req.location_id)
      .eq('exception_date', targetDate)
      .in('shift_id', shiftIds);
    exceptions = excs || [];
  }

  // Build effective shifts
  const activeShifts: EffectiveShift[] = [];
  for (const s of (rawShifts || [])) {
    const exc = exceptions.find((e: any) => e.shift_id === s.id);
    if (exc && exc.exception_type === 'closed') continue;

    activeShifts.push({
      shift_id: s.id,
      shift_name: s.name,
      short_name: s.short_name,
      start_time: exc?.override_start_time || s.start_time,
      end_time: exc?.override_end_time || s.end_time,
      arrival_interval_minutes: s.arrival_interval_minutes,
      color: s.color,
      status: exc ? exc.exception_type : 'active',
      exception_label: exc?.label || null,
    });
  }

  // 3. Get tickets
  const ticketsMap = new Map<string, TicketData>();
  let ticketFilter = supabase
    .from('tickets')
    .select('*')
    .eq('location_id', req.location_id)
    .eq('status', 'active');

  if (req.ticket_id) {
    ticketFilter = ticketFilter.eq('id', req.ticket_id);
  }

  const { data: ticketsData } = await ticketFilter;
  for (const t of (ticketsData || [])) {
    ticketsMap.set(t.id, mapTicket(t));
  }

  const ticketIds = Array.from(ticketsMap.keys());

  // 4. Get shift_tickets + build configs
  const shiftTicketConfigs = new Map<string, ShiftTicketConfig[]>();

  if (shiftIds.length > 0 && ticketIds.length > 0) {
    const { data: stRows } = await supabase
      .from('shift_tickets')
      .select('*')
      .in('shift_id', shiftIds)
      .in('ticket_id', ticketIds)
      .eq('is_active', true);

    for (const st of (stRows || [])) {
      const ticket = ticketsMap.get(st.ticket_id);
      if (!ticket) continue;

      const config: ShiftTicketConfig = {
        shift_id: st.shift_id,
        ticket_id: st.ticket_id,
        ticket_name: ticket.name,
        display_title: ticket.display_title,
        duration_minutes: st.override_duration_minutes ?? ticket.duration_minutes,
        buffer_minutes: st.override_buffer_minutes ?? ticket.buffer_minutes,
        min_party_size: st.override_min_party ?? ticket.min_party_size,
        max_party_size: st.override_max_party ?? ticket.max_party_size,
        pacing_limit: st.pacing_limit,
        seating_limit_guests: st.seating_limit_guests,
        seating_limit_reservations: st.seating_limit_reservations,
        ignore_pacing: st.ignore_pacing ?? false,
        areas: st.areas,
        show_area_name: st.show_area_name ?? false,
        area_display_names: st.area_display_names,
        squeeze_enabled: st.squeeze_enabled ?? ticket.squeeze_enabled,
        squeeze_duration_minutes: st.squeeze_duration_minutes ?? ticket.squeeze_duration_minutes,
        squeeze_gap_minutes: st.squeeze_gap_minutes ?? ticket.squeeze_gap_minutes,
        squeeze_to_fixed_end_time: st.squeeze_to_fixed_end_time ?? ticket.squeeze_to_fixed_end_time,
        squeeze_limit_per_shift: st.squeeze_limit_per_shift ?? ticket.squeeze_limit_per_shift,
        show_end_time: st.show_end_time ?? false,
        waitlist_enabled: st.waitlist_enabled ?? false,
        channel_permissions: st.channel_permissions ?? { widget: true, phone: true },
        policy_set_id: ticket.id ? (ticketsData || []).find((t: any) => t.id === st.ticket_id)?.policy_set_id : null,
      };

      const existing = shiftTicketConfigs.get(st.shift_id) || [];
      existing.push(config);
      shiftTicketConfigs.set(st.shift_id, existing);
    }
  }

  // 5. Get tables
  const { data: tables } = await supabase
    .from('tables')
    .select('id, area_id, min_capacity, max_capacity, is_active, is_online_bookable')
    .eq('location_id', req.location_id)
    .eq('is_active', true);

  // 6. Get table groups + members
  const { data: tableGroups } = await supabase
    .from('table_groups')
    .select('id, combined_min_capacity, combined_max_capacity, is_active, is_online_bookable')
    .eq('location_id', req.location_id)
    .eq('is_active', true);

  const tableGroupIds = (tableGroups || []).map((tg: any) => tg.id);
  let groupMembers: any[] = [];
  if (tableGroupIds.length > 0) {
    const { data: members } = await supabase
      .from('table_group_members')
      .select('table_group_id, table_id')
      .in('table_group_id', tableGroupIds);
    groupMembers = members || [];
  }

  const tableGroupsData: TableGroupData[] = (tableGroups || []).map((tg: any) => ({
    id: tg.id,
    combined_min_capacity: tg.combined_min_capacity,
    combined_max_capacity: tg.combined_max_capacity,
    is_active: tg.is_active,
    is_online_bookable: tg.is_online_bookable,
    member_table_ids: groupMembers
      .filter((m: any) => m.table_group_id === tg.id)
      .map((m: any) => m.table_id),
  }));

  // 7. Reservations stub
  const reservations: ExistingReservation[] = [];

  return {
    shifts: activeShifts,
    shiftTicketConfigs,
    tickets: ticketsMap,
    tables: tables || [],
    tableGroups: tableGroupsData,
    reservations,
    locationTimezone: locData.timezone,
  };
}

// ============================================
// Area Name Loader (for diagnose-slot setting_location)
// ============================================

export async function loadAreaNames(
  supabase: ReturnType<typeof createClient>,
  locationId: string
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from('areas')
    .select('id, name')
    .eq('location_id', locationId);
  
  const map = new Map<string, string>();
  for (const a of (data || [])) {
    map.set(a.id, a.name);
  }
  return map;
}
