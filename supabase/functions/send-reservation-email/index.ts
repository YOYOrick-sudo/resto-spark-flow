import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildEmailHtml, formatDateNL } from '../_shared/emailLayout.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default templates (same as useReservationEmailTemplates.ts)
const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  confirmation: {
    subject: 'Bevestiging: {restaurant} op {datum} om {tijd}',
    body: 'Je reservering bij {restaurant} is bevestigd.\n\nDatum: {datum}\nTijd: {tijd}\nGasten: {gasten} personen\n\nBeheer je reservering via de onderstaande link.\n\n{beheerlink}',
  },
  cancellation: {
    subject: 'Annulering: {restaurant} op {datum}',
    body: 'Beste {voornaam},\n\nJe reservering op {datum} om {tijd} is geannuleerd.\n\nWe hopen je snel weer te zien.\n\n{restaurant}',
  },
  reminder_24h: {
    subject: 'Herinnering: je reservering morgen bij {restaurant}',
    body: 'Beste {voornaam},\n\nDit is een herinnering voor je reservering morgen.\n\nDatum: {datum}\nTijd: {tijd}\nGasten: {gasten} personen\n\nWe kijken ernaar uit je te verwelkomen.\n\n{restaurant}',
  },
  reminder_3h: {
    subject: 'Vanavond: je reservering bij {restaurant} om {tijd}',
    body: 'Beste {voornaam},\n\nNog even ter herinnering — je reservering is vandaag.\n\nDatum: {datum}\nTijd: {tijd}\nGasten: {gasten} personen\n\nTot straks.\n\n{restaurant}',
  },
  reconfirm: {
    subject: 'Bevestig je reservering bij {restaurant}',
    body: 'Beste {voornaam},\n\nWil je je reservering even bevestigen?\n\nDatum: {datum}\nTijd: {tijd}\nGasten: {gasten} personen\n\nKlik op de knop hieronder om te bevestigen.',
  },
  waitlist_confirmation: {
    subject: 'Je staat op de wachtlijst bij {restaurant}',
    body: 'Beste {voornaam},\n\nJe staat op de wachtlijst voor {datum}. We laten het je weten zodra er een plek vrijkomt.\n\n{restaurant}',
  },
  waitlist_invite: {
    subject: 'Er is een plek vrijgekomen bij {restaurant}',
    body: 'Beste {voornaam},\n\nEr is een plek vrijgekomen op jouw gewenste datum.\n\nDatum: {datum}\nTijd: {tijd}\nGasten: {gasten} personen\n\nReserveer snel via de link in deze email.',
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reservation_id, template_key } = await req.json();
    if (!reservation_id || !template_key) {
      return new Response(JSON.stringify({ error: 'reservation_id and template_key required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Load reservation + customer + ticket + location
    const { data: reservation, error: resErr } = await admin
      .from('reservations')
      .select('*, customer:customers(*), ticket:tickets(name, display_title), location:locations(name)')
      .eq('id', reservation_id)
      .single();

    if (resErr || !reservation) {
      return new Response(JSON.stringify({ error: 'Reservation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const customer = reservation.customer;
    if (!customer?.email) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'No customer email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load template (custom or default)
    const { data: customTemplate } = await admin
      .from('reservation_email_templates')
      .select('subject, body, is_active')
      .eq('location_id', reservation.location_id)
      .eq('template_key', template_key)
      .maybeSingle();

    const defaultTpl = DEFAULT_TEMPLATES[template_key];
    if (!defaultTpl && !customTemplate) {
      return new Response(JSON.stringify({ error: `Unknown template_key: ${template_key}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If custom template exists but is inactive, skip
    if (customTemplate && !customTemplate.is_active) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'Template inactive' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tpl = customTemplate || defaultTpl!;

    // Load branding
    const { data: commSettings } = await admin
      .from('communication_settings')
      .select('sender_name, reply_to, brand_color, logo_url, footer_text')
      .eq('location_id', reservation.location_id)
      .maybeSingle();

    const restaurantName = reservation.location?.name ?? 'Restaurant';
    const senderName = commSettings?.sender_name || restaurantName;
    const replyTo = commSettings?.reply_to || undefined;
    const brandColor = commSettings?.brand_color || '#1d979e';
    const logoUrl = commSettings?.logo_url || null;
    const footerText = commSettings?.footer_text || '';
    const ticketName = reservation.ticket?.display_title || reservation.ticket?.name || '';

    // Format
    const formattedDate = formatDateNL(reservation.reservation_date);
    const formattedTime = reservation.start_time?.slice(0, 5) || '';
    const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://resto-spark-flow.lovable.app';
    const manageUrl = reservation.manage_token ? `${baseUrl}/manage/${reservation.manage_token}` : '';

    // Replace placeholders
    const replacements: Record<string, string> = {
      '{voornaam}': customer.first_name || '',
      '{achternaam}': customer.last_name || '',
      '{datum}': formattedDate,
      '{tijd}': formattedTime,
      '{gasten}': String(reservation.party_size),
      '{restaurant}': restaurantName,
      '{beheerlink}': manageUrl,
      '{ticket}': ticketName,
    };

    let subject = tpl.subject;
    let body = tpl.body;
    for (const [key, value] of Object.entries(replacements)) {
      subject = subject.replaceAll(key, value);
      body = body.replaceAll(key, value);
    }

    // Parse body into details array for premium layout
    const detailLabels: Record<string, string> = {
      'Datum': 'DATUM',
      'Tijd': 'TIJD',
      'Gasten': 'GASTEN',
      'Ticket': 'TICKET',
    };

    const lines = body.split('\n');
    const details: Array<{ label: string; value: string }> = [];
    const textLines: string[] = [];

    for (const line of lines) {
      const match = line.match(/^(Datum|Tijd|Gasten|Ticket):\s*(.+)$/);
      if (match) {
        details.push({ label: detailLabels[match[1]] || match[1].toUpperCase(), value: match[2].trim() });
      } else if (line.trim()) {
        textLines.push(line.trim());
      }
    }

    // Build intro from non-detail lines (first paragraph)
    const intro = textLines[0] || `Beste ${customer.first_name},`;

    // Determine CTA
    let ctaUrl: string | undefined;
    let ctaLabel: string | undefined;
    if (manageUrl && template_key !== 'cancellation') {
      ctaUrl = manageUrl;
      ctaLabel = 'Beheer je reservering';
    }

    // Build heading per template type
    const headings: Record<string, string> = {
      confirmation: 'Je reservering is bevestigd',
      cancellation: 'Je reservering is geannuleerd',
      reminder_24h: 'Herinnering aan je reservering',
      reminder_3h: 'Je reservering is vanavond',
      reconfirm: 'Bevestig je reservering',
      waitlist_confirmation: 'Je staat op de wachtlijst',
      waitlist_invite: 'Er is een plek vrijgekomen',
    };

    // If no details were parsed from the body, build them manually
    if (details.length === 0) {
      details.push({ label: 'DATUM', value: formattedDate });
      details.push({ label: 'TIJD', value: `${formattedTime} uur` });
      details.push({ label: 'GASTEN', value: `${reservation.party_size} ${reservation.party_size === 1 ? 'persoon' : 'personen'}` });
      if (ticketName) details.push({ label: 'TICKET', value: ticketName });
    }

    const html = buildEmailHtml({
      logoUrl,
      restaurantName,
      brandColor,
      footerText,
      heading: headings[template_key] || 'Reservering',
      intro,
      details,
      ctaUrl,
      ctaLabel,
    });

    // Send via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.log('[SEND-RES-EMAIL STUB] No RESEND_API_KEY, skipping email to', customer.email);
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'No RESEND_API_KEY' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const verifiedFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
    const payload: Record<string, unknown> = {
      from: `${senderName} <${verifiedFrom}>`,
      to: [customer.email],
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
      console.error(`[SEND-RES-EMAIL] Resend error ${response.status}: ${errBody}`);
      return new Response(JSON.stringify({ ok: false, error: errBody }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    console.log(`[SEND-RES-EMAIL] Sent ${template_key} email: ${result.id} to ${customer.email}`);

    return new Response(JSON.stringify({ ok: true, email_id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[SEND-RES-EMAIL] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
