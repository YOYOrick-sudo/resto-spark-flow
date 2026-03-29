import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// Shared Booking Confirmation Email
// Extracted from public-booking-api for reuse by mollie-webhook
// ============================================

export interface BookingEmailParams {
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
  is_returning_guest: boolean;
}

export async function sendBookingConfirmationEmail(
  admin: ReturnType<typeof createClient>,
  params: BookingEmailParams
) {
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
    <p style="margin:0 0 20px;font-size:14px;color:#666">${params.is_returning_guest ? `Leuk dat je weer bij ons reserveert, ${params.first_name}!` : `Hallo ${params.first_name}, we kijken ernaar uit je te verwelkomen.`}</p>
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
