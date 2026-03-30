import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildEmailHtml, formatDateNL } from './emailLayout.ts';

// ============================================
// Shared Booking Confirmation Email
// Premium restaurant style — no emoji, pure typography
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
  const formattedDate = formatDateNL(params.date);
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

  const intro = params.is_returning_guest
    ? `Leuk dat je weer bij ons reserveert, ${params.first_name}. We kijken ernaar uit je te verwelkomen.`
    : `Beste ${params.first_name}, we kijken ernaar uit je te verwelkomen.`;

  const details: Array<{ label: string; value: string }> = [
    { label: 'DATUM', value: formattedDate },
    { label: 'TIJD', value: `${formattedTime} uur` },
    { label: 'GASTEN', value: `${params.party_size} ${params.party_size === 1 ? 'persoon' : 'personen'}` },
  ];
  if (ticketName) details.push({ label: 'TICKET', value: ticketName });
  if (params.guest_notes) details.push({ label: 'OPMERKING', value: params.guest_notes });

  const subject = `Bevestiging: ${restaurantName} op ${formattedDate} om ${formattedTime}`;

  const html = buildEmailHtml({
    logoUrl,
    restaurantName,
    brandColor,
    footerText,
    heading: 'Je reservering is bevestigd',
    intro,
    details,
    ctaUrl: manageUrl,
    ctaLabel: 'Beheer je reservering',
    secondaryLink: { url: calendarUrl, label: 'Voeg toe aan Google Calendar' },
    note: policyNote || undefined,
  });

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
