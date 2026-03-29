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
    // Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claims.claims.sub;

    const { reservation_id, amount } = await req.json();
    if (!reservation_id) {
      return new Response(JSON.stringify({ error: 'Missing reservation_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = getAdminClient();

    // Fetch reservation
    const { data: res, error: resErr } = await admin
      .from('reservations')
      .select('id, location_id, payment_status, payment_amount, mollie_payment_id')
      .eq('id', reservation_id)
      .single();

    if (resErr || !res) {
      return new Response(JSON.stringify({ error: 'Reservation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!res.mollie_payment_id || res.payment_status !== 'paid') {
      return new Response(JSON.stringify({ error: 'Reservation has no paid payment to refund' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine refund amount
    const refundAmount = amount
      ? parseFloat(amount).toFixed(2)
      : (res.payment_amount || 0).toFixed(2);

    const isPartial = amount && parseFloat(amount) < (res.payment_amount || 0);

    // Create refund via Mollie
    const mollieRes = await mollieRequest(
      admin,
      res.location_id,
      'POST',
      `/v2/payments/${res.mollie_payment_id}/refunds`,
      {
        amount: { currency: 'EUR', value: refundAmount },
        description: `Terugbetaling reservering ${reservation_id}`,
      }
    );

    if (!mollieRes.ok) {
      const errBody = await mollieRes.text();
      console.error('[MOLLIE REFUND] Error:', errBody);
      return new Response(JSON.stringify({ error: 'Failed to create refund' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const refund = await mollieRes.json();

    // Update payment status
    const newStatus = isPartial ? 'partially_refunded' : 'refunded';
    await admin
      .from('reservations')
      .update({ payment_status: newStatus })
      .eq('id', reservation_id);

    // Audit log
    await admin.from('audit_log').insert({
      location_id: res.location_id,
      entity_type: 'reservation',
      entity_id: reservation_id,
      action: isPartial ? 'payment_partially_refunded' : 'payment_refunded',
      actor_type: 'user',
      actor_id: userId,
      changes: { refund_amount: refundAmount, mollie_refund_id: refund.id },
      metadata: {},
    });

    return new Response(JSON.stringify({
      success: true,
      refund_id: refund.id,
      status: newStatus,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[MOLLIE REFUND] Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
