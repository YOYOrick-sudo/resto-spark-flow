import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  type AvailabilityRequest,
  loadEngineData,
  timeToMinutes,
  minutesToTime,
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

// ============================================
// CORS
// ============================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status: number) {
  return jsonResponse({ error: message }, status);
}

// ============================================
// Rate Limiting (in-memory, per-instance)
// ============================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

// ============================================
// Supabase Admin Client
// ============================================
function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ============================================
// Route: GET /config?slug=xxx
// ============================================
async function handleConfig(url: URL) {
  const slug = url.searchParams.get('slug');
  if (!slug) return errorResponse('Missing slug parameter', 400);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('widget_settings')
    .select(`
      location_id, widget_enabled, location_slug,
      widget_primary_color, widget_accent_color, widget_style,
      widget_logo_url, widget_welcome_text,
      widget_success_redirect_url, unavailable_text, show_end_time,
      show_nesto_branding, booking_questions, google_reserve_url
    `)
    .eq('location_slug', slug)
    .eq('widget_enabled', true)
    .single();

  if (error || !data) return errorResponse('Widget not found or disabled', 404);

  // Fetch location name + active tickets in parallel
  const [{ data: loc }, { data: tickets }] = await Promise.all([
    admin.from('locations').select('name, timezone').eq('id', data.location_id).single(),
    admin.from('tickets')
      .select('id, name, display_title, description, short_description, image_url, min_party_size, max_party_size')
      .eq('location_id', data.location_id)
      .eq('status', 'active'),
  ]);

  let minParty = 1;
  let maxParty = 20;
  if (tickets && tickets.length > 0) {
    minParty = Math.min(...tickets.map(t => t.min_party_size ?? 1));
    maxParty = Math.max(...tickets.map(t => t.max_party_size ?? 20));
  }

  return jsonResponse({
    location_id: data.location_id,
    location_name: loc?.name ?? null,
    timezone: loc?.timezone ?? 'Europe/Amsterdam',
    primary_color: data.widget_primary_color,
    accent_color: (data as any).widget_accent_color ?? '#14B8A6',
    widget_style: (data as any).widget_style ?? 'auto',
    logo_url: data.widget_logo_url,
    welcome_text: data.widget_welcome_text,
    success_redirect_url: data.widget_success_redirect_url,
    unavailable_text: data.unavailable_text,
    show_end_time: data.show_end_time,
    show_nesto_branding: data.show_nesto_branding,
    booking_questions: data.booking_questions,
    google_reserve_url: data.google_reserve_url,
    min_party_size: minParty,
    max_party_size: maxParty,
    active_ticket_count: tickets?.length ?? 0,
    tickets: (tickets ?? []).map(t => ({
      id: t.id,
      name: t.name,
      display_title: t.display_title,
      description: t.description,
      short_description: t.short_description,
      image_url: t.image_url,
      min_party_size: t.min_party_size,
      max_party_size: t.max_party_size,
    })),
  });
}

// ============================================
// Route: POST /availability
// ============================================
async function handleAvailability(body: Record<string, unknown>) {
  const { location_id, date, party_size, ticket_id } = body as {
    location_id?: string; date?: string; party_size?: number; ticket_id?: string;
  };

  if (!location_id || !date || !party_size) {
    return errorResponse('Missing required fields: location_id, date, party_size', 400);
  }
  if (party_size < 1 || party_size > 100) {
    return errorResponse('party_size must be between 1 and 100', 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return errorResponse('date must be in YYYY-MM-DD format', 400);
  }

  const admin = getAdminClient();
  const req: AvailabilityRequest = {
    location_id,
    date,
    party_size,
    ticket_id: ticket_id ?? null,
    channel: 'widget',
  };

  const engineData = await loadEngineData(admin, req);
  const result = checkAvailabilityEngine(engineData, req);

  return jsonResponse(result);
}

// ============================================
// Route: POST /availability/month
// ============================================
async function handleAvailabilityMonth(body: Record<string, unknown>) {
  const { location_id, year, month, party_size, ticket_id } = body as {
    location_id?: string; year?: number; month?: number; party_size?: number; ticket_id?: string;
  };

  if (!location_id || !year || !month || !party_size) {
    return errorResponse('Missing required fields: location_id, year, month, party_size', 400);
  }

  const admin = getAdminClient();
  const daysInMonth = new Date(year, month, 0).getDate();
  const available_dates: string[] = [];

  // Check each day in the month (parallel batches of 7)
  for (let batchStart = 1; batchStart <= daysInMonth; batchStart += 7) {
    const batchEnd = Math.min(batchStart + 6, daysInMonth);
    const promises = [];
    
    for (let day = batchStart; day <= batchEnd; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      promises.push(
        (async () => {
          try {
            const req: AvailabilityRequest = {
              location_id,
              date: dateStr,
              party_size,
              ticket_id: ticket_id ?? null,
              channel: 'widget',
            };
            const engineData = await loadEngineData(admin, req);
            const result = checkAvailabilityEngine(engineData, req);
            const hasAvailable = result.shifts.some(s => s.slots.some(sl => sl.available));
            if (hasAvailable) return dateStr;
          } catch {
            // Skip days with errors
          }
          return null;
        })()
      );
    }

    const results = await Promise.all(promises);
    for (const r of results) {
      if (r) available_dates.push(r);
    }
  }

  return jsonResponse({ available_dates });
}

// ============================================
// Route: POST /guest-lookup
// ============================================
async function handleGuestLookup(body: Record<string, unknown>, clientIp: string) {
  const { location_id, email } = body as { location_id?: string; email?: string };
  if (!location_id || !email) return errorResponse('Missing location_id or email', 400);

  // Rate limit: 5 req/min per IP
  const rlKey = `guest-lookup:${clientIp}`;
  if (!checkRateLimit(rlKey, 5, 60_000)) {
    return errorResponse('Too many requests', 429);
  }

  const admin = getAdminClient();
  const { data } = await admin
    .from('customers')
    .select('id, first_name, last_name, phone_number, language, tags')
    .eq('location_id', location_id)
    .ilike('email', email.toLowerCase())
    .limit(1)
    .single();

  if (!data) return jsonResponse({ found: false });

  return jsonResponse({
    found: true,
    customer: {
      id: data.id,
      first_name: data.first_name,
      last_name: data.last_name,
      phone_number: data.phone_number,
      language: data.language,
      tags: data.tags,
    },
  });
}

// ============================================
// Route: POST /book
// ============================================
async function handleBook(body: Record<string, unknown>, clientIp: string) {
  // Rate limit: 10 bookings/min per IP
  const rlKey = `book:${clientIp}`;
  if (!checkRateLimit(rlKey, 10, 60_000)) {
    return errorResponse('Too many booking requests', 429);
  }

  const {
    location_id, date, start_time, party_size,
    shift_id, ticket_id, is_squeeze,
    first_name, last_name, email, phone,
    guest_notes, language,
    booking_answers, honeypot,
  } = body as {
    location_id?: string; date?: string; start_time?: string; party_size?: number;
    shift_id?: string; ticket_id?: string; is_squeeze?: boolean;
    first_name?: string; last_name?: string; email?: string; phone?: string;
    guest_notes?: string; language?: string;
    booking_answers?: Array<{ question_id: string; values: string[] }>;
    honeypot?: string;
  };

  // Honeypot check
  if (honeypot) return errorResponse('Invalid request', 400);

  // Validate required fields
  if (!location_id || !date || !start_time || !party_size || !shift_id || !ticket_id) {
    return errorResponse('Missing required booking fields', 400);
  }
  if (!first_name || !last_name || !email) {
    return errorResponse('Missing guest information (first_name, last_name, email)', 400);
  }

  const admin = getAdminClient();

  // 1. Load widget settings to get booking_questions config
  const { data: widgetSettings } = await admin
    .from('widget_settings')
    .select('booking_questions')
    .eq('location_id', location_id)
    .single();

  const bookingQuestions: Array<{
    id: string; target: string; type: string; label: string; options?: string[];
  }> = (widgetSettings?.booking_questions as any[]) ?? [];

  // 2. Process booking answers into customer_tags and reservation_tags
  const customerTags: string[] = [];
  const reservationTags: string[] = [];

  if (booking_answers && bookingQuestions.length > 0) {
    for (const answer of booking_answers) {
      const question = bookingQuestions.find(q => q.id === answer.question_id);
      if (!question) continue;

      if (question.target === 'customer_tags') {
        customerTags.push(...answer.values);
      } else if (question.target === 'reservation_tags') {
        reservationTags.push(...answer.values);
      }
    }
  }

  // 3. Find or create customer
  let customerId: string | null = null;

  const { data: existingCustomer } = await admin
    .from('customers')
    .select('id, tags')
    .eq('location_id', location_id)
    .ilike('email', email.toLowerCase())
    .limit(1)
    .single();

  if (existingCustomer) {
    customerId = existingCustomer.id;
    // Merge customer tags (deduplicate)
    if (customerTags.length > 0) {
      const existingTags = (existingCustomer.tags as string[]) || [];
      const mergedTags = [...new Set([...existingTags, ...customerTags])];
      await admin
        .from('customers')
        .update({ tags: mergedTags, phone_number: phone || undefined })
        .eq('id', customerId);
    }
  } else {
    const { data: newCustomer, error: custErr } = await admin
      .from('customers')
      .insert({
        location_id,
        first_name,
        last_name,
        email: email.toLowerCase(),
        phone_number: phone || null,
        language: language || 'nl',
        tags: customerTags,
      })
      .select('id')
      .single();

    if (custErr) return errorResponse(`Failed to create customer: ${custErr.message}`, 500);
    customerId = newCustomer!.id;
  }

  // 4. Create reservation via RPC
  const { data: reservationId, error: resErr } = await admin.rpc('create_reservation', {
    _location_id: location_id,
    _customer_id: customerId,
    _shift_id: shift_id,
    _ticket_id: ticket_id,
    _reservation_date: date,
    _start_time: start_time,
    _party_size: party_size,
    _channel: 'widget',
    _guest_notes: guest_notes || null,
    _initial_status: 'confirmed',
    _squeeze: is_squeeze || false,
    _actor_id: null, // Unauthenticated widget booking
  });

  if (resErr) return errorResponse(`Booking failed: ${resErr.message}`, 500);

  // 5. Save reservation tags
  if (reservationTags.length > 0) {
    await admin
      .from('reservations')
      .update({ tags: reservationTags })
      .eq('id', reservationId);
  }

  // 6. Auto-assign table via RPC
  const { data: tableResult } = await admin.rpc('assign_best_table', {
    _location_id: location_id,
    _date: date,
    _time: start_time,
    _party_size: party_size,
    _duration_minutes: 0, // RPC fetches duration from ticket
    _shift_id: shift_id,
    _ticket_id: ticket_id,
    _reservation_id: reservationId,
  });

  // Get manage_token + full reservation data for confirmation
  const { data: resData } = await admin
    .from('reservations')
    .select('manage_token, reservation_date, start_time, end_time, party_size, duration_minutes')
    .eq('id', reservationId)
    .single();

  // 7. Send confirmation email (non-blocking)
  // NOTE: This email logic is inline for now. When operator-created reservations
  // also need confirmation emails, extract to a shared function.
  try {
    await sendBookingConfirmationEmail(admin, {
      location_id,
      reservation_id: reservationId,
      manage_token: resData?.manage_token ?? '',
      date: resData?.reservation_date ?? date,
      start_time: resData?.start_time ?? start_time,
      end_time: resData?.end_time ?? '',
      party_size: resData?.party_size ?? party_size,
      first_name: first_name!,
      last_name: last_name!,
      email: email!,
      ticket_id: ticket_id!,
      guest_notes: guest_notes || null,
    });
  } catch (emailErr) {
    console.error('[BOOKING EMAIL] Failed to send confirmation:', emailErr);
    // Non-blocking: booking is still confirmed
  }

  return jsonResponse({
    success: true,
    reservation_id: reservationId,
    manage_token: resData?.manage_token ?? null,
    table_assigned: tableResult ?? null,
  }, 201);
}

// ============================================
// Booking Confirmation Email
// ============================================
interface BookingEmailParams {
  location_id: string;
  reservation_id: string;
  manage_token: string;
  date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  first_name: string;
  last_name: string;
  email: string;
  ticket_id: string;
  guest_notes: string | null;
}

async function sendBookingConfirmationEmail(admin: ReturnType<typeof getAdminClient>, params: BookingEmailParams) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.log('[BOOKING EMAIL STUB] No RESEND_API_KEY, skipping email to', params.email);
    return;
  }

  // Fetch branding
  const [{ data: commSettings }, { data: location }, { data: ticket }] = await Promise.all([
    admin.from('communication_settings').select('sender_name, reply_to, brand_color, logo_url, footer_text').eq('location_id', params.location_id).maybeSingle(),
    admin.from('locations').select('name').eq('id', params.location_id).single(),
    admin.from('tickets').select('display_title, name, policy_set_id').eq('id', params.ticket_id).single(),
  ]);

  const restaurantName = location?.name ?? 'Restaurant';
  const senderName = commSettings?.sender_name || restaurantName;
  const replyTo = commSettings?.reply_to || undefined;
  const brandColor = commSettings?.brand_color || '#1d979e';
  const logoUrl = commSettings?.logo_url || null;
  const footerText = commSettings?.footer_text || '';
  const ticketName = ticket?.display_title || ticket?.name || '';

  // Cancel policy summary
  let policyNote = '';
  if (ticket?.policy_set_id) {
    const { data: ps } = await admin.from('policy_sets').select('cancel_policy_type, cancel_window_hours').eq('id', ticket.policy_set_id).single();
    if (ps?.cancel_policy_type === 'no_cancel') {
      policyNote = 'Deze reservering kan niet worden geannuleerd.';
    } else if (ps?.cancel_window_hours) {
      policyNote = `Gratis annuleren tot ${ps.cancel_window_hours} uur voor aanvang.`;
    }
  }

  // Format date
  const [y, mo, d] = params.date.split('-');
  const dateObj = new Date(Number(y), Number(mo) - 1, Number(d));
  const dayNames = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const formattedDate = `${dayNames[dateObj.getDay()]} ${Number(d)} ${monthNames[Number(mo) - 1]} ${y}`;
  const formattedTime = params.start_time.slice(0, 5);

  // Google Calendar link
  const calStart = `${params.date.replace(/-/g, '')}T${params.start_time.replace(/:/g, '')}00`;
  const calEnd = params.end_time ? `${params.date.replace(/-/g, '')}T${params.end_time.replace(/:/g, '')}00` : calStart;
  const calTitle = encodeURIComponent(`Reservering ${restaurantName}`);
  const calDetails = encodeURIComponent(`${params.party_size} gasten — ${ticketName}`);
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&dates=${calStart}/${calEnd}&details=${calDetails}`;

  // Manage link
  const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://resto-spark-flow.lovable.app';
  const manageUrl = `${baseUrl}/manage/${params.manage_token}`;

  const subject = `Bevestiging: ${restaurantName} op ${formattedDate} om ${formattedTime}`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f7f7f7">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;padding:32px 16px">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden">
  ${logoUrl ? `<tr><td style="padding:24px 24px 0;text-align:center"><img src="${logoUrl}" alt="${restaurantName}" style="max-height:48px;max-width:200px"></td></tr>` : ''}
  <tr><td style="padding:24px">
    <h1 style="margin:0 0 4px;font-size:20px;color:#111">Je reservering is bevestigd!</h1>
    <p style="margin:0 0 20px;font-size:14px;color:#666">Hallo ${params.first_name}, we kijken ernaar uit je te verwelkomen.</p>
    <table width="100%" style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px" cellpadding="0" cellspacing="0">
      <tr><td style="padding:4px 0;font-size:14px;color:#555">📅 <strong>${formattedDate}</strong></td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#555">🕐 <strong>${formattedTime} uur</strong></td></tr>
      <tr><td style="padding:4px 0;font-size:14px;color:#555">👥 <strong>${params.party_size} ${params.party_size === 1 ? 'gast' : 'gasten'}</strong></td></tr>
      ${ticketName ? `<tr><td style="padding:4px 0;font-size:14px;color:#555">🎫 ${ticketName}</td></tr>` : ''}
      ${params.guest_notes ? `<tr><td style="padding:4px 0;font-size:13px;color:#888">💬 ${params.guest_notes}</td></tr>` : ''}
    </table>
    ${policyNote ? `<p style="font-size:13px;color:#888;margin:0 0 16px">${policyNote}</p>` : ''}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px">
      <tr><td align="center">
        <a href="${manageUrl}" style="display:inline-block;background:${brandColor};color:#fff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none">Beheer je reservering</a>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <a href="${calendarUrl}" style="font-size:13px;color:${brandColor};text-decoration:none">📅 Voeg toe aan Google Calendar</a>
      </td></tr>
    </table>
  </td></tr>
  ${footerText ? `<tr><td style="padding:16px 24px;border-top:1px solid #eee;text-align:center"><p style="margin:0;font-size:12px;color:#999">${footerText}</p></td></tr>` : ''}
</table>
</td></tr></table>
</body></html>`;

  const verifiedFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
  const payload: Record<string, unknown> = {
    from: `${senderName} <${verifiedFrom}>`,
    to: [params.email],
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
    console.error(`[BOOKING EMAIL] Resend error ${response.status}: ${errBody}`);
  } else {
    const result = await response.json();
    console.log(`[BOOKING EMAIL] Sent: ${result.id} to ${params.email}`);
  }
}

// ============================================
// Route: GET /manage?token=xxx
// ============================================
async function handleManageGet(url: URL) {
  const token = url.searchParams.get('token');
  if (!token) return errorResponse('Missing token parameter', 400);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('reservations')
    .select(`
      id, reservation_date, start_time, end_time, party_size,
      status, channel, guest_notes, is_squeeze, duration_minutes,
      checked_in_at, option_expires_at, cancellation_reason, tags,
      customers:customer_id(first_name, last_name, email, phone_number),
      tickets:ticket_id(name, display_title, policy_set_id),
      shifts:shift_id(name, short_name)
    `)
    .eq('manage_token', token)
    .single();

  if (error || !data) return errorResponse('Reservation not found', 404);

  // Load policy set for cancel rules
  let cancelPolicy = null;
  const policySetId = (data.tickets as any)?.policy_set_id;
  if (policySetId) {
    const { data: ps } = await admin
      .from('policy_sets')
      .select('cancel_policy_type, cancel_window_hours, cancel_cutoff_time, refund_type, refund_percentage')
      .eq('id', policySetId)
      .single();
    cancelPolicy = ps;
  }

  // Determine if cancellation/modification is allowed based on policy deadline
  let canCancel = false;
  let canModify = false;

  if ((data.status === 'confirmed' || data.status === 'option') && cancelPolicy?.cancel_policy_type !== 'no_cancel') {
    // Check deadline
    let withinDeadline = true;
    if (cancelPolicy?.cancel_window_hours != null) {
      const resDateTime = new Date(`${data.reservation_date}T${data.start_time}`);
      const deadline = new Date(resDateTime.getTime() - cancelPolicy.cancel_window_hours * 60 * 60 * 1000);
      withinDeadline = new Date() < deadline;
    }
    canCancel = withinDeadline;
    canModify = withinDeadline;
  }

  return jsonResponse({
    location_id: data.location_id,
    reservation: {
      id: data.id,
      date: data.reservation_date,
      start_time: data.start_time,
      end_time: data.end_time,
      party_size: data.party_size,
      status: data.status,
      guest_notes: data.guest_notes,
      duration_minutes: data.duration_minutes,
      tags: data.tags,
      customer: data.customers,
      ticket: data.tickets ? { name: (data.tickets as any).name, display_title: (data.tickets as any).display_title } : null,
      shift: data.shifts ? { name: (data.shifts as any).name, short_name: (data.shifts as any).short_name } : null,
    },
    cancel_policy: cancelPolicy,
    can_cancel: canCancel,
    can_modify: canModify,
  });
}

// ============================================
// Route: POST /manage (cancel/modify)
// ============================================
async function handleManagePost(body: Record<string, unknown>) {
  const { token, action, cancellation_reason, new_date, new_start_time, new_party_size } = body as {
    token?: string; action?: string; cancellation_reason?: string;
    new_date?: string; new_start_time?: string; new_party_size?: number;
  };

  if (!token || !action) return errorResponse('Missing token or action', 400);
  if (action !== 'cancel' && action !== 'modify') return errorResponse('Only cancel and modify actions are supported', 400);

  const admin = getAdminClient();

  // Find reservation by manage_token
  const { data: res, error: findErr } = await admin
    .from('reservations')
    .select('id, status, location_id, ticket_id, shift_id, reservation_date, start_time, party_size, duration_minutes')
    .eq('manage_token', token)
    .single();

  if (findErr || !res) return errorResponse('Reservation not found', 404);
  if (res.status !== 'confirmed' && res.status !== 'option') {
    return errorResponse(`Cannot ${action} reservation with status: ${res.status}`, 422);
  }

  // Check cancel policy deadline
  const { data: ticket } = await admin
    .from('tickets')
    .select('policy_set_id')
    .eq('id', res.ticket_id)
    .single();

  if (ticket?.policy_set_id) {
    const { data: ps } = await admin
      .from('policy_sets')
      .select('cancel_policy_type, cancel_window_hours')
      .eq('id', ticket.policy_set_id)
      .single();

    if (ps?.cancel_policy_type === 'no_cancel') {
      return errorResponse('Cancellation/modification is not allowed for this reservation', 403);
    }

    if (ps?.cancel_window_hours != null) {
      const resDateTime = new Date(`${res.reservation_date}T${res.start_time}`);
      const deadline = new Date(resDateTime.getTime() - ps.cancel_window_hours * 60 * 60 * 1000);
      if (new Date() >= deadline) {
        return errorResponse('De wijzigingsdeadline is verstreken', 403);
      }
    }
  }

  // === CANCEL ===
  if (action === 'cancel') {
    const { error: updateErr } = await admin
      .from('reservations')
      .update({
        status: 'cancelled',
        cancellation_reason: cancellation_reason || 'Cancelled by guest via booking link',
      })
      .eq('id', res.id);

    if (updateErr) return errorResponse(`Cancellation failed: ${updateErr.message}`, 500);

    await admin.from('audit_log').insert({
      location_id: res.location_id,
      entity_type: 'reservation',
      entity_id: res.id,
      action: 'cancelled',
      actor_type: 'guest',
      actor_id: null,
      changes: { reason: cancellation_reason || 'guest_self_cancel', channel: 'widget' },
    });

    return jsonResponse({ success: true, status: 'cancelled' });
  }

  // === MODIFY ===
  if (action === 'modify') {
    if (!new_date || !new_start_time || !new_party_size) {
      return errorResponse('Missing new_date, new_start_time, or new_party_size', 400);
    }

    // Verify availability
    const req: AvailabilityRequest = {
      location_id: res.location_id,
      date: new_date,
      party_size: new_party_size,
      ticket_id: res.ticket_id,
      channel: 'widget',
    };
    const engineData = await loadEngineData(admin, req);
    const result = checkAvailabilityEngine(engineData, req);
    const slotAvailable = result.shifts.some(s =>
      s.slots.some(sl => sl.available && sl.time === new_start_time && sl.ticket_id === res.ticket_id)
    );

    if (!slotAvailable) {
      return errorResponse('Het gekozen tijdslot is niet meer beschikbaar', 422);
    }

    // Find the matching slot for duration
    let newDuration = res.duration_minutes;
    for (const s of result.shifts) {
      const slot = s.slots.find(sl => sl.available && sl.time === new_start_time && sl.ticket_id === res.ticket_id);
      if (slot) { newDuration = slot.duration_minutes; break; }
    }

    // Compute new end time
    const [h, m] = new_start_time.split(':').map(Number);
    const endTotalMin = h * 60 + m + newDuration;
    const endH = Math.floor(endTotalMin / 60) % 24;
    const endM = endTotalMin % 60;
    const newEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const changes: Record<string, unknown> = {};
    if (new_date !== res.reservation_date) changes.date = { from: res.reservation_date, to: new_date };
    if (new_start_time !== res.start_time) changes.start_time = { from: res.start_time, to: new_start_time };
    if (new_party_size !== res.party_size) changes.party_size = { from: res.party_size, to: new_party_size };

    // Update reservation
    const { error: updateErr } = await admin
      .from('reservations')
      .update({
        reservation_date: new_date,
        start_time: new_start_time,
        end_time: newEndTime,
        party_size: new_party_size,
        duration_minutes: newDuration,
      })
      .eq('id', res.id);

    if (updateErr) return errorResponse(`Modification failed: ${updateErr.message}`, 500);

    // Re-assign table
    await admin.rpc('assign_best_table', {
      _location_id: res.location_id,
      _date: new_date,
      _time: new_start_time,
      _party_size: new_party_size,
      _duration_minutes: newDuration,
      _shift_id: res.shift_id,
      _ticket_id: res.ticket_id,
      _reservation_id: res.id,
    });

    // Audit log
    await admin.from('audit_log').insert({
      location_id: res.location_id,
      entity_type: 'reservation',
      entity_id: res.id,
      action: 'modified',
      actor_type: 'guest',
      actor_id: null,
      changes: { ...changes, channel: 'widget' },
    });

    return jsonResponse({ success: true, status: 'modified' });
  }

  return errorResponse('Unknown action', 400);
}

// ============================================
// Availability Engine (reuse from check-availability)
// ============================================

function checkAvailabilityEngine(
  data: EngineData,
  req: AvailabilityRequest
) {
  const channel = 'widget';
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

  // Booking window
  const advanceMinutes = timeInfo.advanceMinutes(slotMinutes);
  const maxDays = ticket.booking_window_max_days ?? 365;
  if (timeInfo.advanceDays > maxDays) return unavailable('booking_window');
  const isLargeParty = ticket.large_party_threshold != null && partySize >= ticket.large_party_threshold;
  const minAdvance = isLargeParty && ticket.large_party_min_minutes != null
    ? ticket.large_party_min_minutes : (ticket.booking_window_min_minutes ?? 60);
  if (advanceMinutes < minAdvance) return unavailable('booking_window');

  // Party size
  if (partySize < config.min_party_size || partySize > config.max_party_size) return unavailable('party_size');

  // Channel
  const perms = config.channel_permissions;
  if (!(perms?.widget ?? true)) return unavailable('channel_blocked');

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

  // Seating limit
  if (config.seating_limit_guests != null) {
    const totalCovers = data.reservations
      .filter(r => r.shift_id === shift.shift_id && r.ticket_id === config.ticket_id)
      .reduce((sum, r) => sum + r.party_size, 0);
    if (totalCovers + partySize > config.seating_limit_guests) {
      return trySqueezeOrFail(slotTime, slotMinutes, shift, config, ticket, data, partySize, 'max_covers', baseDuration);
    }
  }

  // Table availability
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
// Router
// ============================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Extract route from path: /public-booking-api/config → config
    const pathParts = url.pathname.split('/').filter(Boolean);
    // pathParts: ["public-booking-api", "config"] or ["public-booking-api", "availability", "month"]
    const route = pathParts.slice(1).join('/') || '';

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    // GET routes
    if (req.method === 'GET') {
      if (route === 'config') return await handleConfig(url);
      if (route === 'manage') return await handleManageGet(url);
      return errorResponse('Not found', 404);
    }

    // POST routes
    if (req.method === 'POST') {
      const body = await req.json();
      if (route === 'availability') return await handleAvailability(body);
      if (route === 'availability/month') return await handleAvailabilityMonth(body);
      if (route === 'guest-lookup') return await handleGuestLookup(body, clientIp);
      if (route === 'book') return await handleBook(body, clientIp);
      if (route === 'manage') return await handleManagePost(body);
      return errorResponse('Not found', 404);
    }

    return errorResponse('Method not allowed', 405);
  } catch (err) {
    console.error('Public booking API error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal server error', 500);
  }
});
