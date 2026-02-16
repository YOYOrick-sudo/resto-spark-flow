import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  type AvailabilityRequest,
  type AvailabilityResponse,
  type ShiftResult,
  type SlotResult,
  type SlotType,
  type ReasonCode,
  type EffectiveShift,
  type ShiftTicketConfig,
  type TicketData,
  type EngineData,
  type ExistingReservation,
  timeToMinutes,
  minutesToTime,
  generateSlotTimes,
  getNowInTimezone,
  loadEngineData,
} from '../_shared/availabilityEngine.ts';

// ============================================
// CORS
// ============================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

  const unavailable = (reason: ReasonCode): SlotResult => ({
    time: slotTime,
    available: false,
    slot_type: null,
    reason_code: reason,
    ticket_id: config.ticket_id,
    ticket_name: config.ticket_name,
    duration_minutes: baseDuration,
  });

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
    const maxDays = ticket.booking_window_max_days ?? 365;
    if (timeInfo.advanceDays > maxDays) {
      return unavailable('booking_window');
    }
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
      whatsapp: perms?.widget ?? true,
      phone: perms?.phone ?? true,
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
    data, config, partySize, slotMinutes, slotEndMinutes, channel
  );

  if (!hasTable) {
    return trySqueezeOrFail(
      slotTime, slotMinutes, shift, config, ticket, data,
      partySize, overbookingCovers, 'tables_full', baseDuration
    );
  }

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

  const squeezeEnabled = config.squeeze_enabled ?? ticket.squeeze_enabled;
  if (!squeezeEnabled) return unavailable;

  const squeezeLimit = config.squeeze_limit_per_shift ?? ticket.squeeze_limit_per_shift;
  if (squeezeLimit != null) {
    const currentSqueezeCount = data.reservations.filter(
      r => r.shift_id === shift.shift_id && r.ticket_id === config.ticket_id && r.is_squeeze
    ).length;
    if (currentSqueezeCount >= squeezeLimit) return unavailable;
  }

  let squeezeDuration: number;
  const fixedEndTime = config.squeeze_to_fixed_end_time ?? ticket.squeeze_to_fixed_end_time;

  if (fixedEndTime) {
    const fixedEndMinutes = timeToMinutes(fixedEndTime);
    squeezeDuration = fixedEndMinutes - slotMinutes;
    if (squeezeDuration <= 0) return unavailable;
  } else {
    squeezeDuration = config.squeeze_duration_minutes ?? ticket.squeeze_duration_minutes ?? normalDuration;
  }

  if (squeezeDuration >= normalDuration) return unavailable;

  const squeezeBuffer = config.buffer_minutes;
  const squeezeEndMinutes = slotMinutes + squeezeDuration + squeezeBuffer;

  const hasTable = checkTableAvailability(
    data, config, partySize, slotMinutes, squeezeEndMinutes, 'widget'
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
  const allowedAreas = config.areas;

  const candidateTables = data.tables.filter(t => {
    if (!t.is_active) return false;
    if (channel !== 'operator' && !t.is_online_bookable) return false;
    if (allowedAreas && allowedAreas.length > 0 && !allowedAreas.includes(t.area_id)) return false;
    if (partySize < t.min_capacity || partySize > t.max_capacity) return false;
    return true;
  });

  for (const table of candidateTables) {
    const isFree = isTableFree(data.reservations, table.id, startMinutes, endMinutes);
    if (isFree) return true;
  }

  for (const group of data.tableGroups) {
    if (!group.is_active) continue;
    if (channel !== 'operator' && !group.is_online_bookable) continue;
    if (partySize < group.combined_min_capacity || partySize > group.combined_max_capacity) continue;

    if (allowedAreas && allowedAreas.length > 0) {
      const groupTableAreaIds = data.tables
        .filter(t => group.member_table_ids.includes(t.id))
        .map(t => t.area_id);
      if (!groupTableAreaIds.some(aId => allowedAreas.includes(aId))) continue;
    }

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
  for (const r of reservations) {
    if (r.table_id !== tableId) continue;
    const rStart = timeToMinutes(r.start_time);
    const rEnd = timeToMinutes(r.end_time);
    if (rStart < endMinutes && rEnd > startMinutes) return false;
  }
  return true;
}

// ============================================
// HTTP Handler
// ============================================

Deno.serve(async (req) => {
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

    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return new Response(
        JSON.stringify({ error: 'date must be in YYYY-MM-DD format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const engineData = await loadEngineData(supabaseAdmin, body);
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
