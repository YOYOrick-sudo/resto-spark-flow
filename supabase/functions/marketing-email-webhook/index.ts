import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Handles Resend webhook events for marketing email tracking.
 * Also handles direct unsubscribe link clicks (GET with ?action=unsubscribe).
 * 
 * Tracked events: email.delivered, email.opened, email.clicked, email.bounced, email.complained
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle direct unsubscribe link clicks (GET request)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const customerId = url.searchParams.get('customer_id');
    const locationId = url.searchParams.get('location_id');

    if (action === 'unsubscribe' && customerId && locationId) {
      await supabaseAdmin
        .from('marketing_contact_preferences')
        .update({
          opted_in: false,
          opted_out_at: new Date().toISOString(),
        })
        .eq('customer_id', customerId)
        .eq('location_id', locationId)
        .eq('channel', 'email');

      return new Response(
        '<html><body style="font-family:sans-serif;text-align:center;padding:60px;"><h2>Je bent uitgeschreven</h2><p>Je ontvangt geen marketing emails meer van dit restaurant.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    return new Response('OK', { status: 200 });
  }

  // Handle Resend webhook POST events
  try {
    const payload = await req.json();
    const eventType = payload.type;
    const emailId = payload.data?.email_id;

    if (!eventType || !emailId) {
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Lookup the email log entry by resend_message_id
    const { data: logEntry, error: lookupErr } = await supabaseAdmin
      .from('marketing_email_log')
      .select('id, campaign_id, customer_id, location_id, status')
      .eq('resend_message_id', emailId)
      .maybeSingle();

    if (lookupErr || !logEntry) {
      console.log(`[WEBHOOK] No log entry found for resend_message_id: ${emailId}`);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const now = new Date().toISOString();

    switch (eventType) {
      case 'email.delivered': {
        await supabaseAdmin
          .from('marketing_email_log')
          .update({ status: 'delivered', delivered_at: now })
          .eq('id', logEntry.id);

        if (logEntry.campaign_id) {
          await supabaseAdmin.rpc('increment_campaign_analytics', {
            _campaign_id: logEntry.campaign_id,
            _location_id: logEntry.location_id,
            _field: 'delivered_count',
          }).catch(() => {
            // Fallback: direct update if RPC doesn't exist
            supabaseAdmin
              .from('marketing_campaign_analytics')
              .update({ delivered_count: supabaseAdmin.raw?.('delivered_count + 1') })
              .eq('campaign_id', logEntry.campaign_id);
          });
        }
        break;
      }

      case 'email.opened': {
        const updateData: any = { opened_at: now };
        if (logEntry.status !== 'clicked') {
          updateData.status = 'opened';
        }
        await supabaseAdmin
          .from('marketing_email_log')
          .update(updateData)
          .eq('id', logEntry.id);
        break;
      }

      case 'email.clicked': {
        await supabaseAdmin
          .from('marketing_email_log')
          .update({ status: 'clicked', clicked_at: now })
          .eq('id', logEntry.id);
        break;
      }

      case 'email.bounced': {
        const bounceType = payload.data?.bounce_type || 'hard';
        await supabaseAdmin
          .from('marketing_email_log')
          .update({ status: 'bounced', bounced_at: now, bounce_type: bounceType })
          .eq('id', logEntry.id);

        // Hard bounce: mark customer email as invalid
        if (bounceType === 'hard') {
          await supabaseAdmin
            .from('customers')
            .update({ email: null })
            .eq('id', logEntry.customer_id);
          console.log(`[WEBHOOK] Hard bounce: cleared email for customer ${logEntry.customer_id}`);
        }
        break;
      }

      case 'email.complained': {
        await supabaseAdmin
          .from('marketing_email_log')
          .update({ status: 'unsubscribed', unsubscribed_at: now })
          .eq('id', logEntry.id);

        // Opt-out the customer
        await supabaseAdmin
          .from('marketing_contact_preferences')
          .update({ opted_in: false, opted_out_at: now })
          .eq('customer_id', logEntry.customer_id)
          .eq('location_id', logEntry.location_id)
          .eq('channel', 'email');
        break;
      }

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${eventType}`);
    }

    // Increment analytics counters via direct SQL for reliability
    if (logEntry.campaign_id && ['email.delivered', 'email.opened', 'email.clicked', 'email.bounced', 'email.complained'].includes(eventType)) {
      const fieldMap: Record<string, string> = {
        'email.delivered': 'delivered_count',
        'email.opened': 'opened_count',
        'email.clicked': 'clicked_count',
        'email.bounced': 'bounced_count',
        'email.complained': 'unsubscribed_count',
      };
      const field = fieldMap[eventType];
      if (field) {
        // Use raw SQL via supabaseAdmin to increment
        await supabaseAdmin.rpc('increment_marketing_analytics', {
          p_campaign_id: logEntry.campaign_id,
          p_location_id: logEntry.location_id,
          p_field: field,
        }).catch((err: any) => {
          console.warn(`[WEBHOOK] Analytics increment failed for ${field}:`, err.message);
        });
      }
    }

    return new Response('OK', { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    return new Response('OK', { status: 200, headers: corsHeaders });
  }
});
