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

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ============================================
// Availability Engine (duplicated for self-contained function)
// ============================================

function checkAvailabilityEngine(data: EngineData, req: AvailabilityRequest) {
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
        slots.push(evaluateSlot(slotMinutes, slotTime, shift, config, ticket, data, req.party_size, 'operator', 0, timeInfo));
      }
    }
    shiftResults.push({ shift_id: shift.shift_id, shift_name: shift.shift_name, start_time: shift.start_time, end_time: shift.end_time, slots });
  }
  return { shifts: shiftResults };
}

function evaluateSlot(
  slotMinutes: number, slotTime: string, shift: EffectiveShift,
  config: ShiftTicketConfig, ticket: TicketData, data: EngineData,
  partySize: number, _channel: string, _overbookingCovers: number,
  _timeInfo: ReturnType<typeof getNowInTimezone>
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

  if (partySize < config.min_party_size || partySize > config.max_party_size) return unavailable('party_size');

  const slotEndMinutes = slotMinutes + baseDuration + buffer;
  if (!config.ignore_pacing && config.pacing_limit != null) {
    const intervalEnd = slotMinutes + shift.arrival_interval_minutes;
    const covers = data.reservations
      .filter(r => r.shift_id === shift.shift_id && timeToMinutes(r.start_time) >= slotMinutes && timeToMinutes(r.start_time) < intervalEnd)
      .reduce((sum, r) => sum + r.party_size, 0);
    if (covers + partySize > config.pacing_limit) return unavailable('pacing_full');
  }

  if (config.seating_limit_guests != null) {
    const totalCovers = data.reservations
      .filter(r => r.shift_id === shift.shift_id && r.ticket_id === config.ticket_id)
      .reduce((sum, r) => sum + r.party_size, 0);
    if (totalCovers + partySize > config.seating_limit_guests) return unavailable('max_covers');
  }

  if (!checkTableAvail(data, config, partySize, slotMinutes, slotEndMinutes)) return unavailable('tables_full');

  return available('normal', baseDuration);
}

function checkTableAvail(data: EngineData, config: ShiftTicketConfig, partySize: number, startMin: number, endMin: number): boolean {
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
// Send Booking Confirmation (same as public-booking-api)
// ============================================

async function sendConfirmationEmail(
  admin: ReturnType<typeof createClient>,
  params: { location_id: string; reservation_id: string; manage_token: string; date: string; start_time: string; end_time: string; party_size: number; first_name: string; email: string; ticket_id: string }
) {
  const { buildEmailHtml, formatDateNL } = await import('../_shared/emailLayout.ts');

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) return;

  const [{ data: commSettings }, { data: loc }, { data: ticket }] = await Promise.all([
    admin.from('communication_settings').select('sender_name, reply_to, brand_color, logo_url, footer_text').eq('location_id', params.location_id).maybeSingle(),
    admin.from('locations').select('name').eq('id', params.location_id).single(),
    admin.from('tickets').select('display_title, name').eq('id', params.ticket_id).single(),
  ]);

  const restaurantName = loc?.name ?? 'Restaurant';
  const senderName = commSettings?.sender_name || restaurantName;
  const brandColor = commSettings?.brand_color || '#1d979e';
  const logoUrl = commSettings?.logo_url || null;
  const footerText = commSettings?.footer_text || '';
  const ticketName = ticket?.display_title || ticket?.name || '';

  const formattedDate = formatDateNL(params.date);
  const formattedTime = params.start_time.slice(0, 5);

  const baseUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://resto-spark-flow.lovable.app').replace(/\/$/, '');
  const manageUrl = `${baseUrl}/manage/${params.manage_token}`;

  const details: Array<{ label: string; value: string }> = [
    { label: 'DATUM', value: formattedDate },
    { label: 'TIJD', value: `${formattedTime} uur` },
    { label: 'GASTEN', value: `${params.party_size} ${params.party_size === 1 ? 'persoon' : 'personen'}` },
  ];
  if (ticketName) details.push({ label: 'TICKET', value: ticketName });

  const subject = `Bevestiging: ${restaurantName} op ${formattedDate} om ${formattedTime}`;

  const html = buildEmailHtml({
    logoUrl,
    restaurantName,
    brandColor,
    footerText,
    heading: 'Je reservering via de wachtlijst is bevestigd',
    intro: `Gefeliciteerd ${params.first_name}, er was een plek voor je.`,
    details,
    ctaUrl: manageUrl,
    ctaLabel: 'Beheer je reservering',
  });

  const verifiedFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
  const replyTo = commSettings?.reply_to || undefined;
  const payload: Record<string, unknown> = {
    from: `${senderName} <${verifiedFrom}>`,
    to: [params.email],
    subject,
    html,
  };
  if (replyTo) payload.reply_to = replyTo;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ============================================
// Handlers
// ============================================

async function handleGet(url: URL) {
  const token = url.searchParams.get('token');
  if (!token) return jsonResponse({ error: 'Missing token' }, 400);

  const admin = getAdminClient();
  const { data: invite } = await admin
    .from('waitlist_invites')
    .select('*, waitlist_entries(*)')
    .eq('invite_token', token)
    .single();

  if (!invite) return jsonResponse({ error: 'Invite not found' }, 404);

  const isExpired = invite.status !== 'sent' || new Date(invite.expires_at) < new Date();

  // Get location info
  const { data: loc } = await admin.from('locations').select('name').eq('id', invite.location_id).single();
  const { data: ticket } = invite.ticket_id
    ? await admin.from('tickets').select('display_title, name').eq('id', invite.ticket_id).single()
    : { data: null };
  const { data: commSettings } = await admin.from('communication_settings').select('logo_url, brand_color').eq('location_id', invite.location_id).maybeSingle();

  return jsonResponse({
    invite_token: invite.invite_token,
    status: isExpired ? 'expired' : invite.status,
    slot_date: invite.slot_date,
    slot_time: invite.slot_time,
    party_size: invite.party_size,
    expires_at: invite.expires_at,
    restaurant_name: loc?.name ?? null,
    logo_url: commSettings?.logo_url ?? null,
    brand_color: commSettings?.brand_color ?? '#1d979e',
    ticket_name: ticket?.display_title || ticket?.name || null,
    entry: invite.waitlist_entries ? {
      first_name: invite.waitlist_entries.first_name,
      last_name: invite.waitlist_entries.last_name,
      email: invite.waitlist_entries.email,
    } : null,
  });
}

async function handleAccept(body: Record<string, unknown>) {
  const { token } = body as { token?: string };
  if (!token) return jsonResponse({ error: 'Missing token' }, 400);

  const admin = getAdminClient();

  // 1. Find invite + entry
  const { data: invite } = await admin
    .from('waitlist_invites')
    .select('*, waitlist_entries(*)')
    .eq('invite_token', token)
    .single();

  if (!invite) return jsonResponse({ error: 'Invite not found' }, 404);

  // 2. Validate status + expiry
  if (invite.status !== 'sent') {
    return jsonResponse({ error: 'Invite already used or expired', status: invite.status }, 422);
  }
  if (new Date(invite.expires_at) < new Date()) {
    // Expire invite, put entry back to pending
    await admin.from('waitlist_invites').update({ status: 'expired' }).eq('id', invite.id);
    await admin.from('waitlist_entries').update({ status: 'pending' }).eq('id', invite.waitlist_entry_id);
    return jsonResponse({ error: 'expired', message: 'Deze uitnodiging is verlopen. Je staat weer op de wachtlijst.' }, 410);
  }

  const entry = invite.waitlist_entries;
  if (!entry) return jsonResponse({ error: 'Entry not found' }, 404);

  // 3. Check availability atomically
  const avReq: AvailabilityRequest = {
    location_id: invite.location_id,
    date: invite.slot_date,
    party_size: invite.party_size,
    ticket_id: invite.ticket_id || null,
    channel: 'operator',
  };

  const engineData = await loadEngineData(admin, avReq);
  const result = checkAvailabilityEngine(engineData, avReq);

  const slotTime = invite.slot_time.slice(0, 5);
  const slotAvailable = result.shifts.some(s =>
    s.slots.some(sl => sl.available && sl.time === slotTime && (!invite.ticket_id || sl.ticket_id === invite.ticket_id))
  );

  if (!slotAvailable) {
    // Slot taken — expire invite, put entry back
    await admin.from('waitlist_invites').update({ status: 'expired' }).eq('id', invite.id);
    await admin.from('waitlist_entries').update({ status: 'pending' }).eq('id', invite.waitlist_entry_id);

    await admin.from('audit_log').insert({
      location_id: invite.location_id,
      entity_type: 'waitlist_invite',
      entity_id: invite.id,
      action: 'waitlist_invite_expired',
      actor_type: 'system',
      changes: { reason: 'slot_no_longer_available' },
    });

    return jsonResponse({ error: 'slot_taken', message: 'Helaas, deze plek is net vergeven. Je staat weer op de wachtlijst.' }, 409);
  }

  // 4. Find shift_id for the slot
  let matchShiftId: string | null = null;
  let matchDuration = 0;
  for (const s of result.shifts) {
    const slot = s.slots.find(sl => sl.available && sl.time === slotTime && (!invite.ticket_id || sl.ticket_id === invite.ticket_id));
    if (slot) {
      matchShiftId = s.shift_id;
      matchDuration = slot.duration_minutes;
      break;
    }
  }

  if (!matchShiftId) return jsonResponse({ error: 'No matching shift found' }, 500);

  // 5. Create reservation
  const { data: reservationId, error: resErr } = await admin.rpc('create_reservation', {
    _location_id: invite.location_id,
    _customer_id: entry.customer_id || null,
    _shift_id: matchShiftId,
    _ticket_id: invite.ticket_id,
    _reservation_date: invite.slot_date,
    _start_time: invite.slot_time,
    _party_size: invite.party_size,
    _channel: 'widget',
    _guest_notes: entry.notes || null,
    _initial_status: 'confirmed',
    _squeeze: false,
    _actor_id: null,
  });

  if (resErr) return jsonResponse({ error: `Booking failed: ${resErr.message}` }, 500);

  // 6. Auto-assign table
  await admin.rpc('assign_best_table', {
    _location_id: invite.location_id,
    _date: invite.slot_date,
    _time: invite.slot_time,
    _party_size: invite.party_size,
    _duration_minutes: matchDuration,
    _shift_id: matchShiftId,
    _ticket_id: invite.ticket_id,
    _reservation_id: reservationId,
  });

  // 7. Get manage_token
  const { data: resData } = await admin
    .from('reservations')
    .select('manage_token, start_time, end_time')
    .eq('id', reservationId)
    .single();

  // 8. Update invite + entry
  await Promise.all([
    admin.from('waitlist_invites').update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      reservation_id: reservationId,
    }).eq('id', invite.id),
    admin.from('waitlist_entries').update({ status: 'converted' }).eq('id', invite.waitlist_entry_id),
  ]);

  // 9. Send confirmation email
  try {
    await sendConfirmationEmail(admin, {
      location_id: invite.location_id,
      reservation_id: reservationId,
      manage_token: resData?.manage_token ?? '',
      date: invite.slot_date,
      start_time: resData?.start_time ?? invite.slot_time,
      end_time: resData?.end_time ?? '',
      party_size: invite.party_size,
      first_name: entry.first_name,
      email: entry.email,
      ticket_id: invite.ticket_id,
    });
  } catch (e) {
    console.error('[WAITLIST ACCEPT] Email failed:', e);
  }

  // 10. Audit log
  await admin.from('audit_log').insert({
    location_id: invite.location_id,
    entity_type: 'waitlist_invite',
    entity_id: invite.id,
    action: 'waitlist_invite_accepted',
    actor_type: 'guest',
    changes: { reservation_id: reservationId, entry_id: invite.waitlist_entry_id },
  });

  const baseUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://resto-spark-flow.lovable.app').replace(/\/$/, '');
  const manageUrl = resData?.manage_token ? `${baseUrl}/manage/${resData.manage_token}` : null;

  return jsonResponse({
    success: true,
    reservation_id: reservationId,
    manage_url: manageUrl,
  }, 201);
}

// ============================================
// Router
// ============================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    if (req.method === 'GET') {
      return await handleGet(url);
    }

    if (req.method === 'POST') {
      const body = await req.json();
      return await handleAccept(body);
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (err) {
    console.error('[WAITLIST ACCEPT] Error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Internal error' }, 500);
  }
});
