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

const DEFAULT_AVG_REVENUE = 35; // EUR per guest

/**
 * Marketing Attribution Engine
 * Called daily at 02:00 UTC via pg_cron.
 *
 * Attribution model:
 * - 7-day lookback: 50% attribution
 * - 30-day lookback: 25% attribution
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get all locations with marketing activity
    const { data: locations } = await supabaseAdmin
      .from('locations')
      .select('id')
      .eq('is_active', true);

    if (!locations || locations.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalProcessed = 0;

    for (const location of locations) {
      const locationId = location.id;

      // Get sent campaigns for this location
      const { data: campaigns } = await supabaseAdmin
        .from('marketing_campaigns')
        .select('id')
        .eq('location_id', locationId)
        .eq('status', 'sent');

      if (!campaigns || campaigns.length === 0) continue;

      for (const campaign of campaigns) {
        // Get all email logs for this campaign
        const { data: emailLogs } = await supabaseAdmin
          .from('marketing_email_log')
          .select('customer_id, sent_at')
          .eq('campaign_id', campaign.id)
          .eq('location_id', locationId);

        if (!emailLogs || emailLogs.length === 0) continue;

        const customerIds = [...new Set(emailLogs.map((l) => l.customer_id))];

        // Find reservations by these customers after the email was sent
        let totalRevenue = 0;
        let totalReservations = 0;

        // Process in batches of 50 to avoid query limits
        for (let i = 0; i < customerIds.length; i += 50) {
          const batch = customerIds.slice(i, i + 50);

          const { data: reservations } = await supabaseAdmin
            .from('reservations')
            .select('id, customer_id, party_size, reservation_date, created_at')
            .eq('location_id', locationId)
            .in('status', ['confirmed', 'completed'])
            .in('customer_id', batch);

          if (!reservations) continue;

          for (const res of reservations) {
            // Find the email sent to this customer for this campaign
            const emailLog = emailLogs.find((l) => l.customer_id === res.customer_id);
            if (!emailLog) continue;

            const sentAt = new Date(emailLog.sent_at).getTime();
            const reservedAt = new Date(res.created_at).getTime();

            // Only attribute if reservation was AFTER the email
            if (reservedAt <= sentAt) continue;

            const daysDiff = (reservedAt - sentAt) / (1000 * 60 * 60 * 24);

            let attributionRate = 0;
            if (daysDiff <= 7) {
              attributionRate = 0.5; // 50% for 7-day lookback
            } else if (daysDiff <= 30) {
              attributionRate = 0.25; // 25% for 30-day lookback
            }

            if (attributionRate > 0) {
              const estimatedRevenue = (res.party_size || 2) * DEFAULT_AVG_REVENUE * attributionRate;
              totalRevenue += estimatedRevenue;
              totalReservations += attributionRate; // Fractional attribution
            }
          }
        }

        // Upsert analytics
        if (totalRevenue > 0 || totalReservations > 0) {
          // Check if record exists
          const { data: existing } = await supabaseAdmin
            .from('marketing_campaign_analytics')
            .select('id, revenue_attributed, reservations_attributed')
            .eq('campaign_id', campaign.id)
            .eq('location_id', locationId)
            .maybeSingle();

          if (existing) {
            await supabaseAdmin
              .from('marketing_campaign_analytics')
              .update({
                revenue_attributed: Math.round(totalRevenue * 100) / 100,
                reservations_attributed: Math.round(totalReservations),
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
          } else {
            await supabaseAdmin
              .from('marketing_campaign_analytics')
              .insert({
                campaign_id: campaign.id,
                location_id: locationId,
                revenue_attributed: Math.round(totalRevenue * 100) / 100,
                reservations_attributed: Math.round(totalReservations),
              });
          }

          totalProcessed++;
        }
      }
    }

    console.log(`[ATTRIBUTION] Processed ${totalProcessed} campaign attributions`);

    return new Response(JSON.stringify({ processed: totalProcessed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[ATTRIBUTION] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
