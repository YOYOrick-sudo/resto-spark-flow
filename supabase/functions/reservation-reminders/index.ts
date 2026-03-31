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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============================================
// Helpers
// ============================================

function formatDateNL(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-');
  const dateObj = new Date(Number(y), Number(mo) - 1, Number(d));
  const dayNames = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return `${dayNames[dateObj.getDay()]} ${Number(d)} ${monthNames[Number(mo) - 1]} ${y}`;
}

async function sendViaMessaging(
  locationId: string,
  customerId: string,
  templateKey: string,
  templateParams: Record<string, string>,
  reservationId: string
): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        location_id: locationId,
        customer_id: customerId,
        template_key: templateKey,
        template_params: templateParams,
        reservation_id: reservationId,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[REMINDERS] send-message failed for ${templateKey}: ${err}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[REMINDERS] send-message error for ${templateKey}:`, err);
    return false;
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
    // Get all active locations
    const { data: locations } = await admin
      .from('locations')
      .select('id, name, timezone')
      .eq('is_active', true);

    if (!locations || locations.length === 0) {
      return new Response(JSON.stringify({ message: 'No locations' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const totalSent = { reminder_24h: 0, reminder_3h: 0, reconfirm: 0 };

    for (const loc of locations) {
      // Get settings
      const { data: settings } = await admin
        .from('reservation_settings')
        .select('reminder_24h_enabled, reminder_3h_enabled, reconfirm_enabled, reconfirm_min_risk_score')
        .eq('location_id', loc.id)
        .maybeSingle();

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

      // T-24h reminders (reservations for tomorrow)
      if (r24) {
        const { data: reservations24 } = await admin
          .from('reservations')
          .select('id, reservation_date, start_time, party_size, customer_id, customers:customer_id(first_name, last_name, email)')
          .eq('location_id', loc.id)
          .eq('reservation_date', tomorrowStr)
          .in('status', ['confirmed', 'option'])
          .is('reminder_24h_sent_at', null);

        for (const res of (reservations24 || [])) {
          const customer = (res as any).customers;
          if (!customer?.email) continue;

          const sent = await sendViaMessaging(loc.id, res.customer_id, 'reminder_24h', {
            naam: customer.first_name || '',
            datum: formatDateNL(res.reservation_date),
            tijd: res.start_time?.slice(0, 5) || '',
            personen: String(res.party_size),
            restaurant: loc.name,
          }, res.id);

          if (sent) {
            await admin.from('reservations').update({ reminder_24h_sent_at: new Date().toISOString() }).eq('id', res.id);
            totalSent.reminder_24h++;
          }
        }
      }

      // T-3h reminders (reservations starting in next 3 hours)
      if (r3) {
        const nowTime = `${String(nowLocal.getHours()).padStart(2, '0')}:${String(nowLocal.getMinutes()).padStart(2, '0')}:00`;

        const { data: reservations3 } = await admin
          .from('reservations')
          .select('id, reservation_date, start_time, party_size, customer_id, customers:customer_id(first_name, last_name, email)')
          .eq('location_id', loc.id)
          .eq('reservation_date', todayStr)
          .in('status', ['confirmed', 'option'])
          .is('reminder_3h_sent_at', null)
          .gte('start_time', nowTime)
          .lte('start_time', threeHoursTime);

        for (const res of (reservations3 || [])) {
          const customer = (res as any).customers;
          if (!customer?.email) continue;

          const sent = await sendViaMessaging(loc.id, res.customer_id, 'reminder_3h', {
            naam: customer.first_name || '',
            datum: formatDateNL(res.reservation_date),
            tijd: res.start_time?.slice(0, 5) || '',
            personen: String(res.party_size),
            restaurant: loc.name,
          }, res.id);

          if (sent) {
            await admin.from('reservations').update({ reminder_3h_sent_at: new Date().toISOString() }).eq('id', res.id);
            totalSent.reminder_3h++;
          }
        }
      }

      // Reconfirm for high-risk reservations
      if (reconfirmEnabled) {
        const { data: highRisk } = await admin
          .from('reservations')
          .select('id, reservation_date, start_time, party_size, manage_token, no_show_risk_score, customer_id, customers:customer_id(first_name, last_name, email)')
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

          const sent = await sendViaMessaging(loc.id, res.customer_id, 'reservation_reconfirm', {
            naam: customer.first_name || '',
            datum: formatDateNL(res.reservation_date),
            tijd: res.start_time?.slice(0, 5) || '',
            personen: String(res.party_size),
            restaurant: loc.name,
          }, res.id);

          if (sent) {
            totalSent.reconfirm++;
          }
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
