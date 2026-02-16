import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// CORS
// ============================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============================================
// Types
// ============================================

interface AvailabilityRequest {
  location_id: string;
  date: string;            // YYYY-MM-DD
  party_size: number;
  ticket_id?: string | null;
  channel?: 'widget' | 'operator' | 'google' | 'whatsapp';
  overbooking_covers?: number;
}

type ReasonCode =
  | 'shift_closed'
  | 'booking_window'
  | 'party_size'
  | 'channel_blocked'
  | 'pacing_full'
  | 'max_covers'
  | 'tables_full';
type SlotType = 'normal' | 'squeeze';

interface SlotResult {
  time: string;            // "HH:MM"
  available: boolean;
  slot_type: SlotType | null;
  reason_code: ReasonCode | null;
  ticket_id: string;
  ticket_name: string;
  duration_minutes: number;
}

interface ShiftResult {
  shift_id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  slots: SlotResult[];
}

interface AvailabilityResponse {
  shifts: ShiftResult[];
}

// Effective shift from RPC
interface EffectiveShift {
  shift_id: string;
  shift_name: string;
  short_name: string;
  start_time: string;      // "HH:MM:SS"
  end_time: string;
  arrival_interval_minutes: number;
  color: string;
  status: string;          // 'active' | 'closed' | 'modified' | 'special'
  exception_label: string | null;
}

// Ticket data
interface TicketData {
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

// Shift-ticket config (merged/COALESCE'd)
interface ShiftTicketConfig {
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

// Table data
interface TableData {
  id: string;
  area_id: string;
  min_capacity: number;
  max_capacity: number;
  is_active: boolean;
  is_online_bookable: boolean;
}

// Table group data
interface TableGroupData {
  id: string;
  combined_min_capacity: number;
  combined_max_capacity: number;
  is_active: boolean;
  is_online_bookable: boolean;
  member_table_ids: string[];
}

// Existing reservation (stub for now, will be filled in Phase 4.6)
interface ExistingReservation {
  id: string;
  shift_id: string;
  ticket_id: string;
  table_id: string | null;
  table_group_id: string | null;
  start_time: string;      // "HH:MM"
  end_time: string;        // "HH:MM"
  party_size: number;
  is_squeeze: boolean;
}

// All data needed by the engine
interface EngineData {
  shifts: EffectiveShift[];
  shiftTicketConfigs: Map<string, ShiftTicketConfig[]>; // shift_id -> configs
  tickets: Map<string, TicketData>;                      // ticket_id -> ticket
  tables: TableData[];
  tableGroups: TableGroupData[];
  reservations: ExistingReservation[];
  locationTimezone: string;
}

// ============================================
// Time Helpers
// ============================================

/** Parse "HH:MM:SS" or "HH:MM" to minutes since midnight */
function timeToMinutes(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

/** Minutes since midnight to "HH:MM" */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** Generate arrival slots between start and end at given interval */
function generateSlotTimes(startTime: string, endTime: string, intervalMinutes: number): string[] {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const slots: string[] = [];
  // Last bookable slot = end_time - interval (guest must be able to sit for at least one interval)
  for (let t = start; t < end; t += intervalMinutes) {
    slots.push(minutesToTime(t));
  }
  return slots;
}

/** Get current time in location timezone as minutes since midnight, and days advance */
function getNowInTimezone(timezone: string, targetDate: string): { nowMinutes: number; advanceDays: number; advanceMinutes: (slotMinutes: number) => number } {
  // Use Intl to get current time in location timezone
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

  // Calculate advance days
  const [targetYear, targetMonth, targetDay] = targetDate.split('-').map(Number);
  const nowDate = new Date(nowYear, nowMonth - 1, nowDay);
  const target = new Date(targetYear, targetMonth - 1, targetDay);
  const advanceDays = Math.floor((target.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate advance minutes for a given slot
  const advanceMinutes = (slotMinutes: number): number => {
    return advanceDays * 24 * 60 + (slotMinutes - nowMinutes);
  };

  return { nowMinutes, advanceDays, advanceMinutes };
}

// ============================================
// Data Loader
// ============================================

async function loadEngineData(
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
  const dow = new Date(targetDate + 'T12:00:00Z').getUTCDay(); // JS 0=Sun
  const isoDow = dow === 0 ? 7 : dow; // ISO: 1=Mon, 7=Sun

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
    // Location is closed — return empty engine data
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
    if (exc && exc.exception_type === 'closed') continue; // Skip closed shifts

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

  // 3. Get tickets (all active for location, or specific one)
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

  // 4. Get shift_tickets + build configs (inline COALESCE logic)
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

  // 7. Reservations stub — returns empty until Phase 4.6
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

function mapTicket(t: any): TicketData {
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
// Engine — Pure Logic
// ============================================

function checkAvailability(
  data: EngineData,
  req: AvailabilityRequest
): AvailabilityResponse {
  const channel = req.channel || 'widget';
  const overbookingCovers = req.overbooking_covers || 0;
  const timeInfo = getNowInTimezone(data.locationTimezone, req.date);

  const shiftResults: ShiftResult[] = [];

  for (const shift of data.shifts) {
    const configs = data.shiftTicketConfigs.get(shift.shift_id) || [];
    if (configs.length === 0) continue;

    const slotTimes = generateSlotTimes(
      shift.start_time,
      shift.end_time,
      shift.arrival_interval_minutes
    );

    const slots: SlotResult[] = [];

    for (const slotTime of slotTimes) {
      const slotMinutes = timeToMinutes(slotTime);

      for (const config of configs) {
        const ticket = data.tickets.get(config.ticket_id);
        if (!ticket) continue;

        const result = evaluateSlot(
          slotMinutes,
          slotTime,
          shift,
          config,
          ticket,
          data,
          req.party_size,
          channel,
          overbookingCovers,
          timeInfo
        );

        slots.push(result);
      }
    }

    shiftResults.push({
      shift_id: shift.shift_id,
      shift_name: shift.shift_name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      slots,
    });
  }

  return { shifts: shiftResults };
}

function evaluateSlot(
  slotMinutes: number,
  slotTime: string,
  shift: EffectiveShift,
  config: ShiftTicketConfig,
  ticket: TicketData,
  data: EngineData,
  partySize: number,
  channel: string,
  overbookingCovers: number,
  timeInfo: ReturnType<typeof getNowInTimezone>
): SlotResult {
  const baseDuration = config.duration_minutes;
  const buffer = config.buffer_minutes;

  // Helper to create unavailable result
  const unavailable = (reason: ReasonCode): SlotResult => ({
    time: slotTime,
    available: false,
    slot_type: null,
    reason_code: reason,
    ticket_id: config.ticket_id,
    ticket_name: config.ticket_name,
    duration_minutes: baseDuration,
  });

  // Helper to create available result
  const available = (slotType: SlotType, duration: number): SlotResult => ({
    time: slotTime,
    available: true,
    slot_type: slotType,
    reason_code: null,
    ticket_id: config.ticket_id,
    ticket_name: config.ticket_name,
    duration_minutes: duration,
  });

  // === 1. Booking Window Check ===
  if (channel !== 'operator') {
    const advanceMinutes = timeInfo.advanceMinutes(slotMinutes);

    // Max advance (days)
    const maxDays = ticket.booking_window_max_days ?? 365;
    if (timeInfo.advanceDays > maxDays) {
      return unavailable('booking_window');
    }

    // Min advance (minutes)
    const isLargeParty = ticket.large_party_threshold != null && partySize >= ticket.large_party_threshold;
    const minAdvance = isLargeParty && ticket.large_party_min_minutes != null
      ? ticket.large_party_min_minutes
      : (ticket.booking_window_min_minutes ?? 60);

    if (advanceMinutes < minAdvance) {
      return unavailable('booking_window');
    }
  }

  // === 2. Party Size Check ===
  if (partySize < config.min_party_size || partySize > config.max_party_size) {
    return unavailable('party_size');
  }

  // === 3. Channel Check ===
  if (channel !== 'operator') {
    const perms = config.channel_permissions;
    const channelMap: Record<string, boolean> = {
      widget: perms?.widget ?? true,
      google: perms?.google ?? false,
      whatsapp: perms?.widget ?? true, // WhatsApp uses widget permissions for now
    };
    if (channelMap[channel] === false) {
      return unavailable('channel_blocked');
    }
  }

  // === 4. Pacing Check ===
  const slotEndMinutes = slotMinutes + baseDuration + buffer;
  const reservationsInSlot = getReservationsInInterval(
    data.reservations,
    shift.shift_id,
    config.ticket_id,
    slotMinutes,
    shift.arrival_interval_minutes
  );

  if (!config.ignore_pacing && config.pacing_limit != null) {
    const currentCovers = reservationsInSlot.reduce((sum, r) => sum + r.party_size, 0);
    if (currentCovers + partySize > config.pacing_limit + overbookingCovers) {
      // Try squeeze in Pass 2
      return trySqueezeOrFail(
        slotTime, slotMinutes, shift, config, ticket, data,
        partySize, overbookingCovers, 'pacing_full', baseDuration
      );
    }
  }

  // === 5. Max Covers (Seating Limit) Check ===
  if (config.seating_limit_guests != null) {
    const totalCoversInShift = getShiftTotalCovers(
      data.reservations,
      shift.shift_id,
      config.ticket_id
    );
    if (totalCoversInShift + partySize > config.seating_limit_guests + overbookingCovers) {
      return trySqueezeOrFail(
        slotTime, slotMinutes, shift, config, ticket, data,
        partySize, overbookingCovers, 'max_covers', baseDuration
      );
    }
  }

  // === 6. Table Availability Check ===
  const hasTable = checkTableAvailability(
    data,
    config,
    partySize,
    slotMinutes,
    slotEndMinutes,
    channel
  );

  if (!hasTable) {
    return trySqueezeOrFail(
      slotTime, slotMinutes, shift, config, ticket, data,
      partySize, overbookingCovers, 'tables_full', baseDuration
    );
  }

  // All checks passed!
  return available('normal', baseDuration);
}

// ============================================
// Squeeze Pass
// ============================================

function trySqueezeOrFail(
  slotTime: string,
  slotMinutes: number,
  shift: EffectiveShift,
  config: ShiftTicketConfig,
  ticket: TicketData,
  data: EngineData,
  partySize: number,
  overbookingCovers: number,
  failReason: ReasonCode,
  normalDuration: number
): SlotResult {
  const unavailable: SlotResult = {
    time: slotTime,
    available: false,
    slot_type: null,
    reason_code: failReason,
    ticket_id: config.ticket_id,
    ticket_name: config.ticket_name,
    duration_minutes: normalDuration,
  };

  // Is squeeze enabled? (COALESCE: shift_ticket > ticket default)
  const squeezeEnabled = config.squeeze_enabled ?? ticket.squeeze_enabled;
  if (!squeezeEnabled) return unavailable;

  // Check squeeze limit per shift
  const squeezeLimit = config.squeeze_limit_per_shift ?? ticket.squeeze_limit_per_shift;
  if (squeezeLimit != null) {
    const currentSqueezeCount = data.reservations.filter(
      r => r.shift_id === shift.shift_id && r.ticket_id === config.ticket_id && r.is_squeeze
    ).length;
    if (currentSqueezeCount >= squeezeLimit) return unavailable;
  }

  // Calculate squeeze duration
  let squeezeDuration: number;
  const fixedEndTime = config.squeeze_to_fixed_end_time ?? ticket.squeeze_to_fixed_end_time;

  if (fixedEndTime) {
    // Duration = fixed end time - slot time
    const fixedEndMinutes = timeToMinutes(fixedEndTime);
    squeezeDuration = fixedEndMinutes - slotMinutes;
    if (squeezeDuration <= 0) return unavailable;
  } else {
    squeezeDuration = config.squeeze_duration_minutes ?? ticket.squeeze_duration_minutes ?? normalDuration;
  }

  // Squeeze duration must be shorter than normal
  if (squeezeDuration >= normalDuration) return unavailable;

  // Re-check with shorter duration
  const squeezeBuffer = config.buffer_minutes;
  const squeezeEndMinutes = slotMinutes + squeezeDuration + squeezeBuffer;

  // Re-check table availability with shorter duration
  const hasTable = checkTableAvailability(
    data,
    config,
    partySize,
    slotMinutes,
    squeezeEndMinutes,
    'widget' // squeeze is always public-facing logic
  );

  if (!hasTable) return unavailable;

  return {
    time: slotTime,
    available: true,
    slot_type: 'squeeze',
    reason_code: null,
    ticket_id: config.ticket_id,
    ticket_name: config.ticket_name,
    duration_minutes: squeezeDuration,
  };
}

// ============================================
// Reservation Helpers
// ============================================

function getReservationsInInterval(
  reservations: ExistingReservation[],
  shiftId: string,
  ticketId: string,
  slotMinutes: number,
  intervalMinutes: number
): ExistingReservation[] {
  const intervalEnd = slotMinutes + intervalMinutes;
  return reservations.filter(r => {
    if (r.shift_id !== shiftId) return false;
    const rStart = timeToMinutes(r.start_time);
    return rStart >= slotMinutes && rStart < intervalEnd;
  });
}

function getShiftTotalCovers(
  reservations: ExistingReservation[],
  shiftId: string,
  ticketId: string
): number {
  return reservations
    .filter(r => r.shift_id === shiftId && r.ticket_id === ticketId)
    .reduce((sum, r) => sum + r.party_size, 0);
}

// ============================================
// Table Availability
// ============================================

function checkTableAvailability(
  data: EngineData,
  config: ShiftTicketConfig,
  partySize: number,
  startMinutes: number,
  endMinutes: number,
  channel: string
): boolean {
  // Determine allowed areas
  const allowedAreas = config.areas; // null = all areas

  // Filter tables
  const candidateTables = data.tables.filter(t => {
    if (!t.is_active) return false;
    if (channel !== 'operator' && !t.is_online_bookable) return false;
    if (allowedAreas && allowedAreas.length > 0 && !allowedAreas.includes(t.area_id)) return false;
    if (partySize < t.min_capacity || partySize > t.max_capacity) return false;
    return true;
  });

  // Check if any table is free in the time window
  for (const table of candidateTables) {
    const isFree = isTableFree(data.reservations, table.id, startMinutes, endMinutes);
    if (isFree) return true;
  }

  // Check table groups
  for (const group of data.tableGroups) {
    if (!group.is_active) continue;
    if (channel !== 'operator' && !group.is_online_bookable) continue;
    if (partySize < group.combined_min_capacity || partySize > group.combined_max_capacity) continue;

    // Check if allowed areas contain at least one table from the group
    if (allowedAreas && allowedAreas.length > 0) {
      const groupTableAreaIds = data.tables
        .filter(t => group.member_table_ids.includes(t.id))
        .map(t => t.area_id);
      if (!groupTableAreaIds.some(aId => allowedAreas.includes(aId))) continue;
    }

    // All member tables must be free
    const allFree = group.member_table_ids.every(
      tId => isTableFree(data.reservations, tId, startMinutes, endMinutes)
    );
    if (allFree) return true;
  }

  return false;
}

function isTableFree(
  reservations: ExistingReservation[],
  tableId: string,
  startMinutes: number,
  endMinutes: number
): boolean {
  // Check if any existing reservation overlaps with the proposed time window
  for (const r of reservations) {
    if (r.table_id !== tableId) continue;
    const rStart = timeToMinutes(r.start_time);
    const rEnd = timeToMinutes(r.end_time);
    // Overlap: starts before our end AND ends after our start
    if (rStart < endMinutes && rEnd > startMinutes) return false;
  }
  return true;
}

// ============================================
// HTTP Handler
// ============================================

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: AvailabilityRequest = await req.json();

    // Validate required fields
    if (!body.location_id || !body.date || !body.party_size) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: location_id, date, party_size' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.party_size < 1 || body.party_size > 100) {
      return new Response(
        JSON.stringify({ error: 'party_size must be between 1 and 100' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return new Response(
        JSON.stringify({ error: 'date must be in YYYY-MM-DD format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client (bypass RLS — the engine needs to read all data)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Auth check for operator channel
    if (body.channel === 'operator') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized: operator channel requires authentication' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user has location access (using admin client for the check)
      const { data: access } = await supabaseAdmin
        .from('user_location_roles')
        .select('id')
        .eq('user_id', claimsData.claims.sub)
        .eq('location_id', body.location_id)
        .limit(1);

      if (!access || access.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: no access to this location' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Load all data
    const engineData = await loadEngineData(supabaseAdmin, body);

    // Run engine
    const result = checkAvailability(engineData, body);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Availability engine error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
