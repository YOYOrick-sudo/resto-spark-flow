import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  type AvailabilityRequest,
  type EngineData,
  type ShiftTicketConfig,
  type TicketData,
  type EffectiveShift,
  type ExistingReservation,
  timeToMinutes,
  getNowInTimezone,
  loadEngineData,
  loadAreaNames,
} from '../_shared/availabilityEngine.ts';

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

interface DiagnoseRequest {
  location_id: string;
  date: string;         // YYYY-MM-DD
  time: string;         // HH:MM
  party_size: number;
  ticket_id: string;    // required
}

interface ConstraintCheck {
  type: string;
  passed: boolean;
  detail?: string;
  current_value?: number;
  limit_value?: number;
  tables_checked?: number;
  tables_capacity_match?: number;
  tables_occupied?: number;
  setting_location: string;
}

interface DiagnoseResponse {
  available: boolean;
  blocking_constraints: ConstraintCheck[];
  all_constraints: ConstraintCheck[];
  squeeze_possible: boolean;
  squeeze_duration: number | null;
}

// ============================================
// Diagnose Engine
// ============================================

function diagnoseSlot(
  data: EngineData,
  req: DiagnoseRequest,
  areaNames: Map<string, string>
): DiagnoseResponse {
  const slotMinutes = timeToMinutes(req.time);
  const timeInfo = getNowInTimezone(data.locationTimezone, req.date);
  const allConstraints: ConstraintCheck[] = [];

  // Find the shift that contains this slot time
  let targetShift: EffectiveShift | null = null;
  let targetConfig: ShiftTicketConfig | null = null;
  let targetTicket: TicketData | null = null;

  for (const shift of data.shifts) {
    const shiftStart = timeToMinutes(shift.start_time);
    const shiftEnd = timeToMinutes(shift.end_time);
    if (slotMinutes < shiftStart || slotMinutes >= shiftEnd) continue;

    const configs = data.shiftTicketConfigs.get(shift.shift_id) || [];
    const config = configs.find(c => c.ticket_id === req.ticket_id);
    if (!config) continue;

    targetShift = shift;
    targetConfig = config;
    targetTicket = data.tickets.get(req.ticket_id) || null;
    break;
  }

  // If no matching shift/config found
  if (!targetShift || !targetConfig || !targetTicket) {
    return {
      available: false,
      blocking_constraints: [{
        type: 'no_shift',
        passed: false,
        detail: 'Geen actieve shift gevonden voor dit tijdstip en ticket',
        setting_location: 'Shifts → Planning',
      }],
      all_constraints: [{
        type: 'no_shift',
        passed: false,
        detail: 'Geen actieve shift gevonden voor dit tijdstip en ticket',
        setting_location: 'Shifts → Planning',
      }],
      squeeze_possible: false,
      squeeze_duration: null,
    };
  }

  const shift = targetShift;
  const config = targetConfig;
  const ticket = targetTicket;
  const shiftTicketPath = `${shift.shift_name} → ${config.ticket_name}`;

  // === 1. Booking Window Check ===
  {
    const advanceMinutes = timeInfo.advanceMinutes(slotMinutes);
    const maxDays = ticket.booking_window_max_days ?? 365;
    const isLargeParty = ticket.large_party_threshold != null && req.party_size >= ticket.large_party_threshold;
    const minAdvance = isLargeParty && ticket.large_party_min_minutes != null
      ? ticket.large_party_min_minutes
      : (ticket.booking_window_min_minutes ?? 60);

    const tooFarAhead = timeInfo.advanceDays > maxDays;
    const tooSoon = advanceMinutes < minAdvance;
    const passed = !tooFarAhead && !tooSoon;

    allConstraints.push({
      type: 'booking_window',
      passed,
      detail: passed
        ? `Binnen boekingsvenster (${minAdvance} min - ${maxDays} dagen)`
        : tooFarAhead
          ? `Te ver vooruit: ${timeInfo.advanceDays} dagen (max ${maxDays})`
          : `Te kort van tevoren: ${advanceMinutes} min (min ${minAdvance})`,
      setting_location: `Ticket ${config.ticket_name} → Boekingsvenster`,
    });
  }

  // === 2. Party Size Check ===
  {
    const passed = req.party_size >= config.min_party_size && req.party_size <= config.max_party_size;
    allConstraints.push({
      type: 'party_size',
      passed,
      detail: passed
        ? `${req.party_size} personen (${config.min_party_size}-${config.max_party_size})`
        : `${req.party_size} personen valt buiten ${config.min_party_size}-${config.max_party_size}`,
      current_value: req.party_size,
      limit_value: config.max_party_size,
      setting_location: `${shiftTicketPath} → Groepsgrootte`,
    });
  }

  // === 3. Channel Check (operator is always allowed) ===
  {
    allConstraints.push({
      type: 'channel_blocked',
      passed: true,
      detail: 'Operator kanaal — altijd toegestaan',
      setting_location: `${shiftTicketPath} → Kanalen`,
    });
  }

  // === 4. Pacing Check ===
  {
    const reservationsInSlot = getReservationsInInterval(
      data.reservations,
      shift.shift_id,
      config.ticket_id,
      slotMinutes,
      shift.arrival_interval_minutes
    );
    const currentCovers = reservationsInSlot.reduce((sum, r) => sum + r.party_size, 0);

    if (config.ignore_pacing) {
      allConstraints.push({
        type: 'pacing_full',
        passed: true,
        detail: `Pacing overgeslagen (ignore_pacing)`,
        current_value: currentCovers,
        setting_location: `${shiftTicketPath} → Pacing`,
      });
    } else if (config.pacing_limit == null) {
      allConstraints.push({
        type: 'pacing_full',
        passed: true,
        detail: `Geen pacing limiet ingesteld`,
        current_value: currentCovers,
        setting_location: `${shiftTicketPath} → Pacing`,
      });
    } else {
      const passed = currentCovers + req.party_size <= config.pacing_limit;
      allConstraints.push({
        type: 'pacing_full',
        passed,
        detail: passed
          ? `${currentCovers + req.party_size}/${config.pacing_limit} covers in dit interval`
          : `${currentCovers + req.party_size}/${config.pacing_limit} covers in dit interval`,
        current_value: currentCovers + req.party_size,
        limit_value: config.pacing_limit,
        setting_location: `${shiftTicketPath} → Pacing`,
      });
    }
  }

  // === 5. Max Covers (Seating Limit) Check ===
  {
    const totalCoversInShift = getShiftTotalCovers(
      data.reservations,
      shift.shift_id,
      config.ticket_id
    );

    if (config.seating_limit_guests == null) {
      allConstraints.push({
        type: 'max_covers',
        passed: true,
        detail: `Geen zitplaatslimiet ingesteld`,
        current_value: totalCoversInShift,
        setting_location: `${shiftTicketPath} → Zitplaatsen`,
      });
    } else {
      const passed = totalCoversInShift + req.party_size <= config.seating_limit_guests;
      allConstraints.push({
        type: 'max_covers',
        passed,
        detail: passed
          ? `${totalCoversInShift + req.party_size}/${config.seating_limit_guests} totaal covers`
          : `${totalCoversInShift + req.party_size}/${config.seating_limit_guests} totaal covers`,
        current_value: totalCoversInShift + req.party_size,
        limit_value: config.seating_limit_guests,
        setting_location: `${shiftTicketPath} → Zitplaatsen`,
      });
    }
  }

  // === 6. Table Availability Check ===
  {
    const baseDuration = config.duration_minutes;
    const buffer = config.buffer_minutes;
    const endMinutes = slotMinutes + baseDuration + buffer;
    const allowedAreas = config.areas;

    // Count tables
    const candidateTables = data.tables.filter(t => {
      if (!t.is_active) return false;
      if (allowedAreas && allowedAreas.length > 0 && !allowedAreas.includes(t.area_id)) return false;
      return true;
    });

    const capacityMatch = candidateTables.filter(
      t => req.party_size >= t.min_capacity && req.party_size <= t.max_capacity
    );

    let occupiedCount = 0;
    let freeFound = false;

    for (const table of capacityMatch) {
      const isFree = isTableFree(data.reservations, table.id, slotMinutes, endMinutes);
      if (isFree) {
        freeFound = true;
      } else {
        occupiedCount++;
      }
    }

    // Also check table groups
    if (!freeFound) {
      for (const group of data.tableGroups) {
        if (!group.is_active) continue;
        if (req.party_size < group.combined_min_capacity || req.party_size > group.combined_max_capacity) continue;
        if (allowedAreas && allowedAreas.length > 0) {
          const groupTableAreaIds = data.tables
            .filter(t => group.member_table_ids.includes(t.id))
            .map(t => t.area_id);
          if (!groupTableAreaIds.some(aId => allowedAreas.includes(aId))) continue;
        }
        const allFree = group.member_table_ids.every(
          tId => isTableFree(data.reservations, tId, slotMinutes, endMinutes)
        );
        if (allFree) {
          freeFound = true;
          break;
        }
      }
    }

    // Build area names for setting_location
    const areaNamesList = allowedAreas && allowedAreas.length > 0
      ? allowedAreas.map(id => areaNames.get(id) || id).join(', ')
      : 'Alle areas';

    allConstraints.push({
      type: 'tables_full',
      passed: freeFound,
      detail: freeFound
        ? `Tafel beschikbaar voor ${req.party_size} personen`
        : `Geen tafel beschikbaar voor ${req.party_size} personen`,
      tables_checked: candidateTables.length,
      tables_capacity_match: capacityMatch.length,
      tables_occupied: occupiedCount,
      setting_location: `Tafels → ${areaNamesList}`,
    });
  }

  // Determine blocking constraints
  const blockingConstraints = allConstraints.filter(c => !c.passed);
  const isAvailable = blockingConstraints.length === 0;

  // Calculate squeeze possibility
  let squeezePossible = false;
  let squeezeDuration: number | null = null;

  if (!isAvailable) {
    const squeezeEnabled = config.squeeze_enabled ?? ticket.squeeze_enabled;
    if (squeezeEnabled) {
      const fixedEndTime = config.squeeze_to_fixed_end_time ?? ticket.squeeze_to_fixed_end_time;
      const normalDuration = config.duration_minutes;
      let calcDuration: number;

      if (fixedEndTime) {
        const fixedEndMinutes = timeToMinutes(fixedEndTime);
        calcDuration = fixedEndMinutes - slotMinutes;
      } else {
        calcDuration = config.squeeze_duration_minutes ?? ticket.squeeze_duration_minutes ?? normalDuration;
      }

      if (calcDuration > 0 && calcDuration < normalDuration) {
        // Check squeeze limit
        const squeezeLimit = config.squeeze_limit_per_shift ?? ticket.squeeze_limit_per_shift;
        const currentSqueezeCount = data.reservations.filter(
          r => r.shift_id === shift.shift_id && r.ticket_id === config.ticket_id && r.is_squeeze
        ).length;

        if (squeezeLimit == null || currentSqueezeCount < squeezeLimit) {
          // Check if table would be available with shorter duration
          const squeezeEnd = slotMinutes + calcDuration + config.buffer_minutes;
          const hasTable = checkTableAvailabilitySilent(
            data, config, req.party_size, slotMinutes, squeezeEnd
          );
          if (hasTable) {
            squeezePossible = true;
            squeezeDuration = calcDuration;
          }
        }
      }
    }
  }

  return {
    available: isAvailable,
    blocking_constraints: blockingConstraints,
    all_constraints: allConstraints,
    squeeze_possible: squeezePossible,
    squeeze_duration: squeezeDuration,
  };
}

// ============================================
// Helpers (duplicated from check-availability to keep diagnose self-contained)
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

function checkTableAvailabilitySilent(
  data: EngineData,
  config: ShiftTicketConfig,
  partySize: number,
  startMinutes: number,
  endMinutes: number
): boolean {
  const allowedAreas = config.areas;

  const candidateTables = data.tables.filter(t => {
    if (!t.is_active) return false;
    if (allowedAreas && allowedAreas.length > 0 && !allowedAreas.includes(t.area_id)) return false;
    if (partySize < t.min_capacity || partySize > t.max_capacity) return false;
    return true;
  });

  for (const table of candidateTables) {
    if (isTableFree(data.reservations, table.id, startMinutes, endMinutes)) return true;
  }

  for (const group of data.tableGroups) {
    if (!group.is_active) continue;
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

    const body: DiagnoseRequest = await req.json();

    // Validate required fields
    if (!body.location_id || !body.date || !body.time || !body.party_size || !body.ticket_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: location_id, date, time, party_size, ticket_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return new Response(
        JSON.stringify({ error: 'date must be in YYYY-MM-DD format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!/^\d{2}:\d{2}$/.test(body.time)) {
      return new Response(
        JSON.stringify({ error: 'time must be in HH:MM format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth: operator only — JWT required
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: diagnose-slot requires authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

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

    // Verify location access
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

    // Load engine data (reuses shared module)
    const engineReq: AvailabilityRequest = {
      location_id: body.location_id,
      date: body.date,
      party_size: body.party_size,
      ticket_id: body.ticket_id,
      channel: 'operator',
    };

    const [engineData, areaNames] = await Promise.all([
      loadEngineData(supabaseAdmin, engineReq),
      loadAreaNames(supabaseAdmin, body.location_id),
    ]);

    const result = diagnoseSlot(engineData, body, areaNames);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Diagnose-slot error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
