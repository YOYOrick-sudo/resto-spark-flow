import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
// Template loading with fallback
// ============================================

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  reminder_24h: {
    subject: 'Herinnering: je reservering morgen bij {restaurant}',
    body: 'Hoi {voornaam}, dit is een herinnering voor je reservering morgen.\n\n📅 {datum}\n🕐 {tijd}\n👥 {gasten} gasten\n\nWe kijken ernaar uit je te verwelkomen!\n\n{restaurant}',
  },
  reminder_3h: {
    subject: 'Vanavond: je reservering bij {restaurant} om {tijd}',
    body: 'Hoi {voornaam}, nog even ter herinnering — je reservering is vandaag!\n\n📅 {datum}\n🕐 {tijd}\n👥 {gasten} gasten\n\nTot straks!\n\n{restaurant}',
  },
  reconfirm: {
    subject: 'Bevestig je reservering bij {restaurant}',
    body: 'Hoi {voornaam}, wil je je reservering even bevestigen?\n\n📅 {datum}\n🕐 {tijd}\n👥 {gasten} gasten\n\nKlik op de knop hieronder om te bevestigen.',
  },
};

async function loadTemplate(admin: ReturnType<typeof createClient>, locationId: string, key: string) {
  const { data } = await admin
    .from('reservation_email_templates')
    .select('subject, body, is_active')
    .eq('location_id', locationId)
    .eq('template_key', key)
    .maybeSingle();

  if (data && data.is_active && data.subject && data.body) {
    return { subject: data.subject, body: data.body };
  }
  return DEFAULT_TEMPLATES[key] || { subject: '', body: '' };
}

function renderMergeFields(text: string, vars: Record<string, string>): string {
  return text
    .replace(/\{voornaam\}/g, vars.voornaam || '')
    .replace(/\{achternaam\}/g, vars.achternaam || '')
    .replace(/\{datum\}/g, vars.datum || '')
    .replace(/\{tijd\}/g, vars.tijd || '')
    .replace(/\{gasten\}/g, vars.gasten || '')
    .replace(/\{restaurant\}/g, vars.restaurant || '')
    .replace(/\{beheerlink\}/g, vars.beheerlink || '')
    .replace(/\{ticket\}/g, vars.ticket || '');
}

function formatDateNL(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-');
  const dateObj = new Date(Number(y), Number(mo) - 1, Number(d));
  const dayNames = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return `${dayNames[dateObj.getDay()]} ${Number(d)} ${monthNames[Number(mo) - 1]} ${y}`;
}

// ============================================
// Email sending
// ============================================

async function sendEmail(
  admin: ReturnType<typeof createClient>,
  locationId: string,
  toEmail: string,
  subject: string,
  bodyText: string,
  ctaUrl?: string,
  ctaLabel?: string
) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.log(`[REMINDERS STUB] Would send to ${toEmail}: ${subject}`);
    return;
  }

  const [{ data: commSettings }, { data: loc }] = await Promise.all([
    admin.from('communication_settings').select('sender_name, reply_to, brand_color, logo_url').eq('location_id', locationId).maybeSingle(),
    admin.from('locations').select('name').eq('id', locationId).single(),
  ]);

  const restaurantName = loc?.name ?? 'Restaurant';
  const senderName = commSettings?.sender_name || restaurantName;
  const brandColor = commSettings?.brand_color || '#1d979e';
  const logoUrl = commSettings?.logo_url || null;
  const replyTo = commSettings?.reply_to || undefined;

  const bodyHtml = bodyText.split('\n').map(line => `<p style="margin:0 0 8px;font-size:14px;color:#555;line-height:1.5">${line}</p>`).join('');
  const ctaBlock = ctaUrl ? `<table width="100%" style="margin:16px 0"><tr><td align="center"><a href="${ctaUrl}" style="display:inline-block;background:${brandColor};color:#fff;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;text-decoration:none">${ctaLabel || 'Bevestigen'}</a></td></tr></table>` : '';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,sans-serif;background:#f7f7f7">
<table width="100%" style="background:#f7f7f7;padding:32px 16px"><tr><td align="center">
<table width="100%" style="max-width:520px;background:#fff;border-radius:12px;overflow:hidden">
  ${logoUrl ? `<tr><td style="padding:24px 24px 0;text-align:center"><img src="${logoUrl}" alt="${restaurantName}" style="max-height:48px"></td></tr>` : ''}
  <tr><td style="padding:24px">${bodyHtml}${ctaBlock}</td></tr>
</table>
</td></tr></table></body></html>`;

  const verifiedFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
  const payload: Record<string, unknown> = {
    from: `${senderName} <${verifiedFrom}>`,
    to: [toEmail],
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
    console.error(`[REMINDERS] Resend error ${response.status}: ${await response.text()}`);
  }
}

// ============================================
// Main Handler
// ============================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const admin = getAdminClient();

  try {
    // Get all active locations with reservation entitlement
    const { data: locations } = await admin
      .from('locations')
      .select('id, name, timezone')
      .eq('is_active', true);

    if (!locations || locations.length === 0) {
      return new Response(JSON.stringify({ message: 'No locations' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalSent = { reminder_24h: 0, reminder_3h: 0, reconfirm: 0 };

    for (const loc of locations) {
      // Get settings
      const { data: settings } = await admin
        .from('reservation_settings')
        .select('reminder_24h_enabled, reminder_3h_enabled, reconfirm_enabled, reconfirm_min_risk_score')
        .eq('location_id', loc.id)
        .maybeSingle();

      // Default to enabled if no settings row
      const r24 = settings?.reminder_24h_enabled ?? true;
      const r3 = settings?.reminder_3h_enabled ?? true;
      const reconfirmEnabled = settings?.reconfirm_enabled ?? false;
      const riskThreshold = settings?.reconfirm_min_risk_score ?? 60;

      const tz = loc.timezone || 'Europe/Amsterdam';
      const nowLocal = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
      const todayStr = nowLocal.toISOString().slice(0, 10);
      const tomorrowDate = new Date(nowLocal);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

      const nowMinutes = nowLocal.getHours() * 60 + nowLocal.getMinutes();
      const threeHoursLater = nowMinutes + 180;
      const threeHoursTime = `${String(Math.floor(threeHoursLater / 60)).padStart(2, '0')}:${String(threeHoursLater % 60).padStart(2, '0')}:00`;

      const baseUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://resto-spark-flow.lovable.app').replace(/\/$/, '');

      // T-24h reminders (reservations for tomorrow)
      if (r24) {
        const { data: reservations24 } = await admin
          .from('reservations')
          .select('id, reservation_date, start_time, end_time, party_size, manage_token, customer_id, customers:customer_id(first_name, last_name, email)')
          .eq('location_id', loc.id)
          .eq('reservation_date', tomorrowStr)
          .in('status', ['confirmed', 'option'])
          .is('reminder_24h_sent_at', null);

        for (const res of (reservations24 || [])) {
          const customer = (res as any).customers;
          if (!customer?.email) continue;

          const template = await loadTemplate(admin, loc.id, 'reminder_24h');
          const vars = {
            voornaam: customer.first_name || '',
            achternaam: customer.last_name || '',
            datum: formatDateNL(res.reservation_date),
            tijd: res.start_time?.slice(0, 5) || '',
            gasten: String(res.party_size),
            restaurant: loc.name,
            beheerlink: `${baseUrl}/manage/${res.manage_token}`,
            ticket: '',
          };

          await sendEmail(admin, loc.id, customer.email, renderMergeFields(template.subject, vars), renderMergeFields(template.body, vars));
          await admin.from('reservations').update({ reminder_24h_sent_at: new Date().toISOString() }).eq('id', res.id);
          totalSent.reminder_24h++;
        }
      }

      // T-3h reminders (reservations starting in next 3 hours)
      if (r3) {
        const nowTime = `${String(nowLocal.getHours()).padStart(2, '0')}:${String(nowLocal.getMinutes()).padStart(2, '0')}:00`;

        const { data: reservations3 } = await admin
          .from('reservations')
          .select('id, reservation_date, start_time, end_time, party_size, manage_token, customer_id, customers:customer_id(first_name, last_name, email)')
          .eq('location_id', loc.id)
          .eq('reservation_date', todayStr)
          .in('status', ['confirmed', 'option'])
          .is('reminder_3h_sent_at', null)
          .gte('start_time', nowTime)
          .lte('start_time', threeHoursTime);

        for (const res of (reservations3 || [])) {
          const customer = (res as any).customers;
          if (!customer?.email) continue;

          const template = await loadTemplate(admin, loc.id, 'reminder_3h');
          const vars = {
            voornaam: customer.first_name || '',
            achternaam: customer.last_name || '',
            datum: formatDateNL(res.reservation_date),
            tijd: res.start_time?.slice(0, 5) || '',
            gasten: String(res.party_size),
            restaurant: loc.name,
            beheerlink: `${baseUrl}/manage/${res.manage_token}`,
            ticket: '',
          };

          await sendEmail(admin, loc.id, customer.email, renderMergeFields(template.subject, vars), renderMergeFields(template.body, vars));
          await admin.from('reservations').update({ reminder_3h_sent_at: new Date().toISOString() }).eq('id', res.id);
          totalSent.reminder_3h++;
        }
      }

      // Reconfirm for high-risk reservations
      if (reconfirmEnabled) {
        const { data: highRisk } = await admin
          .from('reservations')
          .select('id, reservation_date, start_time, end_time, party_size, manage_token, no_show_risk_score, customer_id, customers:customer_id(first_name, last_name, email)')
          .eq('location_id', loc.id)
          .in('reservation_date', [todayStr, tomorrowStr])
          .in('status', ['confirmed', 'option'])
          .is('reconfirm_sent_at', null)
          .gte('no_show_risk_score', riskThreshold);

        for (const res of (highRisk || [])) {
          const customer = (res as any).customers;
          if (!customer?.email) continue;

          // Generate reconfirm token
          const token = crypto.randomUUID();
          await admin.from('reservations').update({
            reconfirm_token: token,
            reconfirm_sent_at: new Date().toISOString(),
          }).eq('id', res.id);

          const template = await loadTemplate(admin, loc.id, 'reconfirm');
          const reconfirmUrl = `${baseUrl}/reconfirm/${token}`;
          const vars = {
            voornaam: customer.first_name || '',
            achternaam: customer.last_name || '',
            datum: formatDateNL(res.reservation_date),
            tijd: res.start_time?.slice(0, 5) || '',
            gasten: String(res.party_size),
            restaurant: loc.name,
            beheerlink: `${baseUrl}/manage/${res.manage_token}`,
            ticket: '',
          };

          await sendEmail(
            admin, loc.id, customer.email,
            renderMergeFields(template.subject, vars),
            renderMergeFields(template.body, vars),
            reconfirmUrl,
            'Bevestig mijn reservering'
          );
          totalSent.reconfirm++;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent: totalSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[REMINDERS] Error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
