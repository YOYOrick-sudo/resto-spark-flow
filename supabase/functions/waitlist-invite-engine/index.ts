import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  type AvailabilityRequest,
  loadEngineData,
  timeToMinutes,
  generateSlotTimes,
  getNowInTimezone,
  type EngineData,
  type ShiftResult,
  type SlotResult,
  type SlotType,
  type ReasonCode,
  type EffectiveShift,
  type ShiftTicketConfig,
  type TicketData,
  type ExistingReservation,
} from '../_shared/availabilityEngine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ============================================
// Availability Engine (same as public-booking-api)
// ============================================

function checkAvailabilityEngine(data: EngineData, req: AvailabilityRequest) {
  const channel = req.channel || 'widget';
  const timeInfo = getNowInTimezone(data.locationTimezone, req.date);
  const shiftResults: ShiftResult[] = [];

  for (const shift of data.shifts) {
    const configs = data.shiftTicketConfigs.get(shift.shift_id) || [];
    if (configs.length === 0) continue;

    const slotTimes = generateSlotTimes(shift.start_time, shift.end_time, shift.arrival_interval_minutes);
    const slots: SlotResult[] = [];

    for (const slotTime of slotTimes) {
      const slotMinutes = timeToMinutes(slotTime);
      for (const config of configs) {
        const ticket = data.tickets.get(config.ticket_id);
        if (!ticket) continue;
        slots.push(evaluateSlot(slotMinutes, slotTime, shift, config, ticket, data, req.party_size, channel, 0, timeInfo));
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
  slotMinutes: number, slotTime: string, shift: EffectiveShift,
  config: ShiftTicketConfig, ticket: TicketData, data: EngineData,
  partySize: number, channel: string, overbookingCovers: number,
  timeInfo: ReturnType<typeof getNowInTimezone>
): SlotResult {
  const baseDuration = config.duration_minutes;
  const buffer = config.buffer_minutes;

  const unavailable = (reason: ReasonCode): SlotResult => ({
    time: slotTime, available: false, slot_type: null, reason_code: reason,
    ticket_id: config.ticket_id, ticket_name: config.ticket_name, duration_minutes: baseDuration,
  });
  const available = (slotType: SlotType, duration: number): SlotResult => ({
    time: slotTime, available: true, slot_type: slotType, reason_code: null,
    ticket_id: config.ticket_id, ticket_name: config.ticket_name, duration_minutes: duration,
  });

  // Booking window — skip for operator/system channel
  if (channel === 'widget') {
    const advanceMinutes = timeInfo.advanceMinutes(slotMinutes);
    const maxDays = ticket.booking_window_max_days ?? 365;
    if (timeInfo.advanceDays > maxDays) return unavailable('booking_window');
    const isLargeParty = ticket.large_party_threshold != null && partySize >= ticket.large_party_threshold;
    const minAdvance = isLargeParty && ticket.large_party_min_minutes != null
      ? ticket.large_party_min_minutes : (ticket.booking_window_min_minutes ?? 60);
    if (advanceMinutes < minAdvance) return unavailable('booking_window');
  }

  if (partySize < config.min_party_size || partySize > config.max_party_size) return unavailable('party_size');

  // Pacing
  const slotEndMinutes = slotMinutes + baseDuration + buffer;
  if (!config.ignore_pacing && config.pacing_limit != null) {
    const intervalEnd = slotMinutes + shift.arrival_interval_minutes;
    const covers = data.reservations
      .filter(r => r.shift_id === shift.shift_id && timeToMinutes(r.start_time) >= slotMinutes && timeToMinutes(r.start_time) < intervalEnd)
      .reduce((sum, r) => sum + r.party_size, 0);
    if (covers + partySize > config.pacing_limit) {
      return trySqueezeOrFail(slotTime, slotMinutes, shift, config, ticket, data, partySize, 'pacing_full', baseDuration);
    }
  }

  if (config.seating_limit_guests != null) {
    const totalCovers = data.reservations
      .filter(r => r.shift_id === shift.shift_id && r.ticket_id === config.ticket_id)
      .reduce((sum, r) => sum + r.party_size, 0);
    if (totalCovers + partySize > config.seating_limit_guests) {
      return trySqueezeOrFail(slotTime, slotMinutes, shift, config, ticket, data, partySize, 'max_covers', baseDuration);
    }
  }

  if (!checkTableAvail(data, config, partySize, slotMinutes, slotEndMinutes)) {
    return trySqueezeOrFail(slotTime, slotMinutes, shift, config, ticket, data, partySize, 'tables_full', baseDuration);
  }

  return available('normal', baseDuration);
}

function trySqueezeOrFail(
  slotTime: string, slotMinutes: number, shift: EffectiveShift,
  config: ShiftTicketConfig, ticket: TicketData, data: EngineData,
  partySize: number, failReason: ReasonCode, normalDuration: number
): SlotResult {
  const unavail: SlotResult = {
    time: slotTime, available: false, slot_type: null, reason_code: failReason,
    ticket_id: config.ticket_id, ticket_name: config.ticket_name, duration_minutes: normalDuration,
  };

  const squeezeEnabled = config.squeeze_enabled ?? ticket.squeeze_enabled;
  if (!squeezeEnabled) return unavail;

  const squeezeLimit = config.squeeze_limit_per_shift ?? ticket.squeeze_limit_per_shift;
  if (squeezeLimit != null) {
    const count = data.reservations.filter(r => r.shift_id === shift.shift_id && r.ticket_id === config.ticket_id && r.is_squeeze).length;
    if (count >= squeezeLimit) return unavail;
  }

  let squeezeDuration: number;
  const fixedEnd = config.squeeze_to_fixed_end_time ?? ticket.squeeze_to_fixed_end_time;
  if (fixedEnd) {
    squeezeDuration = timeToMinutes(fixedEnd) - slotMinutes;
    if (squeezeDuration <= 0) return unavail;
  } else {
    squeezeDuration = config.squeeze_duration_minutes ?? ticket.squeeze_duration_minutes ?? normalDuration;
  }
  if (squeezeDuration >= normalDuration) return unavail;

  const squeezeEnd = slotMinutes + squeezeDuration + config.buffer_minutes;
  if (!checkTableAvail(data, config, partySize, slotMinutes, squeezeEnd)) return unavail;

  return {
    time: slotTime, available: true, slot_type: 'squeeze', reason_code: null,
    ticket_id: config.ticket_id, ticket_name: config.ticket_name, duration_minutes: squeezeDuration,
  };
}

function checkTableAvail(
  data: EngineData, config: ShiftTicketConfig, partySize: number,
  startMin: number, endMin: number
): boolean {
  const areas = config.areas;
  const candidates = data.tables.filter(t => {
    if (!t.is_active || !t.is_online_bookable) return false;
    if (areas?.length && !areas.includes(t.area_id)) return false;
    return partySize >= t.min_capacity && partySize <= t.max_capacity;
  });

  for (const t of candidates) {
    if (isTableFree(data.reservations, t.id, startMin, endMin)) return true;
  }

  for (const g of data.tableGroups) {
    if (!g.is_active || !g.is_online_bookable) continue;
    if (partySize < g.combined_min_capacity || partySize > g.combined_max_capacity) continue;
    if (areas?.length) {
      const gAreas = data.tables.filter(t => g.member_table_ids.includes(t.id)).map(t => t.area_id);
      if (!gAreas.some(a => areas.includes(a))) continue;
    }
    if (g.member_table_ids.every(id => isTableFree(data.reservations, id, startMin, endMin))) return true;
  }

  return false;
}

function isTableFree(reservations: ExistingReservation[], tableId: string, startMin: number, endMin: number): boolean {
  for (const r of reservations) {
    if (r.table_id !== tableId) continue;
    const rStart = timeToMinutes(r.start_time);
    const rEnd = timeToMinutes(r.end_time);
    if (rStart < endMin && rEnd > startMin) return false;
  }
  return true;
}

// ============================================
// Priority Score Calculation
// ============================================

async function calculatePriorityScore(
  admin: ReturnType<typeof createClient>,
  entry: any,
  cancelledSlotTime: string | null,
  cancelledPartySize: number | null,
  cancelledTicketId: string | null
): Promise<number> {
  let score = 0;

  // +10 returning guest
  if (entry.customer_id) {
    const { count } = await admin
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', entry.customer_id)
      .eq('location_id', entry.location_id)
      .in('status', ['completed', 'confirmed', 'seated']);
    if (count && count > 0) score += 10;
  }

  // +5 exact time match
  if (cancelledSlotTime && entry.preferred_time_from && entry.preferred_time_to) {
    const slotMin = timeToMinutes(cancelledSlotTime);
    const fromMin = timeToMinutes(entry.preferred_time_from);
    const toMin = timeToMinutes(entry.preferred_time_to);
    if (slotMin >= fromMin && slotMin <= toMin) score += 5;
  } else if (cancelledSlotTime && !entry.preferred_time_from) {
    // Flexible guest — slight bonus
    score += 3;
  }

  // +3 exact party size match
  if (cancelledPartySize && entry.party_size === cancelledPartySize) score += 3;

  // +2 ticket match
  if (cancelledTicketId && entry.ticket_id === cancelledTicketId) score += 2;

  return score;
}

// ============================================
// Send Waitlist Invite Email
// ============================================

async function sendInviteEmail(
  admin: ReturnType<typeof createClient>,
  entry: any,
  invite: any,
  locationId: string
) {
  const { buildEmailHtml, formatDateNL } = await import('../_shared/emailLayout.ts');

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.log(`[WAITLIST EMAIL STUB] Would send invite to ${entry.email}`);
    return;
  }

  const [{ data: loc }, { data: commSettings }, { data: ticket }] = await Promise.all([
    admin.from('locations').select('name').eq('id', locationId).single(),
    admin.from('communication_settings').select('sender_name, reply_to, brand_color, logo_url, footer_text').eq('location_id', locationId).maybeSingle(),
    invite.ticket_id ? admin.from('tickets').select('display_title, name').eq('id', invite.ticket_id).single() : Promise.resolve({ data: null }),
  ]);

  const restaurantName = loc?.name ?? 'Restaurant';
  const senderName = commSettings?.sender_name || restaurantName;
  const replyTo = commSettings?.reply_to || undefined;
  const brandColor = commSettings?.brand_color || '#1d979e';
  const logoUrl = commSettings?.logo_url || null;
  const footerText = commSettings?.footer_text || '';
  const ticketName = ticket?.display_title || ticket?.name || '';

  const formattedDate = formatDateNL(invite.slot_date);
  const formattedTime = invite.slot_time.slice(0, 5);

  const expiresDate = new Date(invite.expires_at);
  const expiresFormatted = `${String(expiresDate.getHours()).padStart(2, '0')}:${String(expiresDate.getMinutes()).padStart(2, '0')}`;

  const baseUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://resto-spark-flow.lovable.app').replace(/\/$/, '');
  const acceptUrl = `${baseUrl}/waitlist/accept/${invite.invite_token}`;

  const intro = entry.customer_id
    ? `Leuk dat je weer bij ons wilt komen, ${entry.first_name}. Er is een plek vrijgekomen op jouw gewenste datum.`
    : `Beste ${entry.first_name}, goed nieuws — er is een plek vrijgekomen.`;

  const details: Array<{ label: string; value: string }> = [
    { label: 'DATUM', value: formattedDate },
    { label: 'TIJD', value: `${formattedTime} uur` },
    { label: 'GASTEN', value: `${invite.party_size} ${invite.party_size === 1 ? 'persoon' : 'personen'}` },
  ];
  if (ticketName) details.push({ label: 'TICKET', value: ticketName });

  const subject = `Er is een plek vrijgekomen bij ${restaurantName}`;

  const html = buildEmailHtml({
    logoUrl,
    restaurantName,
    brandColor,
    footerText,
    heading: 'Er is een plek vrijgekomen',
    intro,
    details,
    ctaUrl: acceptUrl,
    ctaLabel: 'Reserveer deze plek',
    note: `Deze uitnodiging is geldig tot ${expiresFormatted} uur.`,
  });

  const verifiedFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
  const payload: Record<string, unknown> = {
    from: `${senderName} <${verifiedFrom}>`,
    to: [entry.email],
    subject,
    html,
  };
  if (replyTo) payload.reply_to = replyTo;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error(`[WAITLIST EMAIL] Resend error ${response.status}: ${errBody}`);
  } else {
    const result = await response.json();
    console.log(`[WAITLIST EMAIL] Sent invite: ${result.id} to ${entry.email}`);
  }
}

// ============================================
// Main Handler
// ============================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { location_id, date, start_time, party_size, shift_id, ticket_id } = body;

    if (!location_id || !date) {
      return new Response(JSON.stringify({ error: 'Missing location_id or date' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = getAdminClient();

    // 1. Check waitlist settings
    const { data: settings } = await admin
      .from('waitlist_settings')
      .select('*')
      .eq('location_id', location_id)
      .maybeSingle();

    if (!settings?.waitlist_enabled || !settings?.auto_invite_enabled) {
      console.log('[WAITLIST ENGINE] Waitlist or auto-invite disabled, skipping');
      return new Response(JSON.stringify({ skipped: true, reason: 'disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Delay if configured (max 30 seconds in edge function context)
    const delayMs = Math.min((settings.auto_invite_delay_minutes || 0) * 60 * 1000, 30_000);
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    // 3. Find matching pending entries
    let query = admin
      .from('waitlist_entries')
      .select('*')
      .eq('location_id', location_id)
      .eq('date', date)
      .eq('status', 'pending')
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: true });

    const { data: entries } = await query;
    if (!entries || entries.length === 0) {
      console.log('[WAITLIST ENGINE] No pending entries found');
      return new Response(JSON.stringify({ skipped: true, reason: 'no_entries' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. For each entry, check availability for their party size
    const maxInvites = settings.max_parallel_invites || 1;
    let invitesSent = 0;

    for (const entry of entries) {
      if (invitesSent >= maxInvites) break;

      // Calculate priority score
      const score = await calculatePriorityScore(
        admin, entry, start_time || null, party_size || null, ticket_id || null
      );

      // Update priority score
      await admin.from('waitlist_entries').update({ priority_score: score }).eq('id', entry.id);

      // Check availability for this entry's party size
      const avReq: AvailabilityRequest = {
        location_id,
        date,
        party_size: entry.party_size,
        ticket_id: entry.ticket_id || ticket_id || null,
        channel: 'operator', // Use operator channel to bypass widget booking window restrictions
      };

      const engineData = await loadEngineData(admin, avReq);
      const result = checkAvailabilityEngine(engineData, avReq);

      // Find available slots that match time preference
      let bestSlot: SlotResult | null = null;
      let bestShiftId: string | null = null;

      for (const s of result.shifts) {
        // If entry has shift preference, filter
        if (entry.shift_id && s.shift_id !== entry.shift_id) continue;

        for (const slot of s.slots) {
          if (!slot.available) continue;

          // Check time preference
          if (entry.preferred_time_from && entry.preferred_time_to) {
            const slotMin = timeToMinutes(slot.time);
            const fromMin = timeToMinutes(entry.preferred_time_from);
            const toMin = timeToMinutes(entry.preferred_time_to);
            if (slotMin < fromMin || slotMin > toMin) continue;
          }

          // Prefer exact cancelled slot time if available
          if (start_time && slot.time === start_time.slice(0, 5)) {
            bestSlot = slot;
            bestShiftId = s.shift_id;
            break;
          }

          if (!bestSlot) {
            bestSlot = slot;
            bestShiftId = s.shift_id;
          }
        }
        if (bestSlot && start_time && bestSlot.time === start_time.slice(0, 5)) break;
      }

      if (!bestSlot || !bestShiftId) continue;

      // 5. Create invite
      const expiresAt = new Date(Date.now() + (settings.invite_window_minutes || 30) * 60 * 1000).toISOString();
      const inviteToken = crypto.randomUUID();

      const { data: invite, error: invErr } = await admin
        .from('waitlist_invites')
        .insert({
          waitlist_entry_id: entry.id,
          location_id,
          ticket_id: bestSlot.ticket_id,
          slot_date: date,
          slot_time: bestSlot.time,
          party_size: entry.party_size,
          invite_token: inviteToken,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (invErr) {
        console.error(`[WAITLIST ENGINE] Failed to create invite: ${invErr.message}`);
        continue;
      }

      // 6. Update entry status
      await admin.from('waitlist_entries').update({ status: 'invited' }).eq('id', entry.id);

      // 7. Send email
      await sendInviteEmail(admin, entry, invite, location_id);

      // 8. Audit log
      await admin.from('audit_log').insert({
        location_id,
        entity_type: 'waitlist_invite',
        entity_id: invite.id,
        action: 'waitlist_invite_sent',
        actor_type: 'system',
        changes: {
          entry_id: entry.id,
          slot_time: bestSlot.time,
          party_size: entry.party_size,
          priority_score: score,
          mode: 'auto',
        },
      });

      invitesSent++;
      console.log(`[WAITLIST ENGINE] Invite sent to ${entry.email} for ${date} ${bestSlot.time}`);
    }

    return new Response(JSON.stringify({ success: true, invites_sent: invitesSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[WAITLIST ENGINE] Error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
