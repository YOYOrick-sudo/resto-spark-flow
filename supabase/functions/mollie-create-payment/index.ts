import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { mollieRequest } from '../_shared/mollieClient.ts';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { reservation_id } = await req.json();
    if (!reservation_id) {
      return new Response(JSON.stringify({ error: 'Missing reservation_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = getAdminClient();

    // Fetch reservation with ticket + policy_set
    const { data: res, error: resErr } = await admin
      .from('reservations')
      .select(`
        id, location_id, party_size, reservation_date, start_time,
        payment_status, mollie_payment_id, manage_token,
        customers:customer_id(first_name, last_name, email),
        tickets:ticket_id(name, display_title, policy_set_id)
      `)
      .eq('id', reservation_id)
      .single();

    if (resErr || !res) {
      return new Response(JSON.stringify({ error: 'Reservation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If already has a payment, return existing checkout URL or error
    if (res.mollie_payment_id && res.payment_status === 'pending') {
      // Try to fetch existing payment's checkout URL
      const existingRes = await mollieRequest(admin, res.location_id, 'GET', `/v2/payments/${res.mollie_payment_id}`);
      if (existingRes.ok) {
        const existing = await existingRes.json();
        if (existing._links?.checkout?.href) {
          return new Response(JSON.stringify({ checkout_url: existing._links.checkout.href }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Get policy set for payment amount
    const ticket = res.tickets as any;
    if (!ticket?.policy_set_id) {
      return new Response(JSON.stringify({ error: 'No policy set configured for this ticket' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: policySet } = await admin
      .from('policy_sets')
      .select('payment_type, payment_amount_cents')
      .eq('id', ticket.policy_set_id)
      .single();

    if (!policySet || policySet.payment_type === 'none' || !policySet.payment_amount_cents) {
      return new Response(JSON.stringify({ error: 'No payment required for this ticket' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate amount
    const totalCents = policySet.payment_amount_cents * res.party_size;
    const amount = (totalCents / 100).toFixed(2);

    // Get restaurant name for description
    const { data: loc } = await admin.from('locations').select('name').eq('id', res.location_id).single();
    const restaurantName = loc?.name || 'Restaurant';
    const ticketName = ticket.display_title || ticket.name || '';
    const customer = res.customers as any;

    // Webhook URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const webhookUrl = `${supabaseUrl}/functions/v1/mollie-webhook`;

    // Redirect URL (manage page)
    const siteUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://resto-spark-flow.lovable.app').replace(/\/$/, '');
    const redirectUrl = `${siteUrl}/manage/${res.manage_token}`;

    // Application fee
    const appFeeCents = Math.round(parseFloat(Deno.env.get('MOLLIE_APPLICATION_FEE') || '0') * 100);

    // Create Mollie payment
    const paymentBody: Record<string, unknown> = {
      amount: { currency: 'EUR', value: amount },
      description: `${restaurantName} — ${ticketName} (${res.party_size} gasten)`,
      redirectUrl,
      webhookUrl,
      metadata: {
        reservation_id: res.id,
        location_id: res.location_id,
      },
      method: 'ideal',
    };

    // Add application fee if configured
    if (appFeeCents > 0) {
      paymentBody.applicationFee = {
        amount: { currency: 'EUR', value: (appFeeCents / 100).toFixed(2) },
        description: 'Nesto service fee',
      };
    }

    const mollieRes = await mollieRequest(
      admin,
      res.location_id,
      'POST',
      '/v2/payments',
      paymentBody,
      { 'Idempotency-Key': `nesto-${reservation_id}` }
    );

    if (!mollieRes.ok) {
      const errBody = await mollieRes.text();
      console.error('[MOLLIE CREATE PAYMENT] Error:', errBody);
      return new Response(JSON.stringify({ error: 'Failed to create payment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payment = await mollieRes.json();

    // Update reservation with payment info
    await admin
      .from('reservations')
      .update({
        payment_status: 'pending',
        payment_amount: parseFloat(amount),
        mollie_payment_id: payment.id,
      })
      .eq('id', reservation_id);

    // Audit log
    await admin.from('audit_log').insert({
      location_id: res.location_id,
      entity_type: 'reservation',
      entity_id: reservation_id,
      action: 'payment_created',
      actor_type: 'system',
      changes: { mollie_payment_id: payment.id, amount, currency: 'EUR' },
      metadata: {},
    });

    return new Response(JSON.stringify({
      checkout_url: payment._links?.checkout?.href || null,
      payment_id: payment.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[MOLLIE CREATE PAYMENT] Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
