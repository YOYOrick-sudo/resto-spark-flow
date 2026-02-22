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

interface Recipient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

/**
 * Personalizes HTML content with customer and restaurant data.
 */
function personalize(html: string, recipient: Recipient, restaurantName: string): string {
  return html
    .replace(/\{\{first_name\}\}/g, recipient.first_name || '')
    .replace(/\{\{last_name\}\}/g, recipient.last_name || '')
    .replace(/\{\{restaurant_name\}\}/g, restaurantName || '');
}

/**
 * Appends an unsubscribe link to email HTML.
 * Marketing emails ALWAYS contain an unsubscribe link (unlike transactional emails).
 */
function addUnsubscribeLink(html: string, customerId: string, locationId: string): string {
  const baseUrl = Deno.env.get('SUPABASE_URL') || '';
  const unsubUrl = `${baseUrl}/functions/v1/marketing-email-webhook?action=unsubscribe&customer_id=${customerId}&location_id=${locationId}`;
  const footer = `
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
      <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline;">Uitschrijven</a>
    </div>`;
  // Insert before closing </body> or append
  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`);
  }
  return html + footer;
}

/**
 * Sends a batch of emails via Resend batch API (max 100 per call).
 */
async function sendBatch(
  emails: Array<{ from: string; to: string; subject: string; html: string; reply_to?: string }>,
  apiKey: string
): Promise<Array<{ id: string }>> {
  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emails),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[MARKETING] Resend batch error ${response.status}: ${errorBody}`);
    throw new Error(`Resend batch failed: ${response.status}`);
  }

  const result = await response.json();
  return result.data || [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    let { campaign_id } = body;

    // If called by cron without specific campaign_id, find all due scheduled campaigns
    if (!campaign_id && body.scheduled_check) {
      const { data: dueCampaigns } = await supabaseAdmin
        .from('marketing_campaigns')
        .select('id')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date().toISOString());

      if (!dueCampaigns || dueCampaigns.length === 0) {
        return new Response(JSON.stringify({ message: 'No scheduled campaigns due' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Process each scheduled campaign by recursively calling ourselves
      const results = [];
      for (const camp of dueCampaigns) {
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const resp = await fetch(`${supabaseUrl}/functions/v1/marketing-send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.get('Authorization') || '' },
            body: JSON.stringify({ campaign_id: camp.id }),
          });
          const result = await resp.json();
          results.push({ campaign_id: camp.id, ...result });
        } catch (e) {
          results.push({ campaign_id: camp.id, error: e.message });
        }
      }

      return new Response(JSON.stringify({ scheduled_processed: results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!campaign_id) {
      return new Response(JSON.stringify({ error: 'campaign_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // 1. Load campaign
    const { data: campaign, error: campErr } = await supabaseAdmin
      .from('marketing_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['scheduled', 'sending'].includes(campaign.status)) {
      return new Response(JSON.stringify({ error: `Invalid status: ${campaign.status}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Update status to 'sending'
    await supabaseAdmin
      .from('marketing_campaigns')
      .update({ status: 'sending' })
      .eq('id', campaign_id);

    const locationId = campaign.location_id;

    // 3. Load brand kit
    const { data: brandKit } = await supabaseAdmin
      .from('marketing_brand_kit')
      .select('marketing_sender_name, marketing_reply_to, max_email_frequency_days, logo_url')
      .eq('location_id', locationId)
      .maybeSingle();

    const senderName = brandKit?.marketing_sender_name || 'Nesto';
    const replyTo = brandKit?.marketing_reply_to || undefined;
    const maxFreqDays = brandKit?.max_email_frequency_days ?? 3;

    // 4. Load restaurant name
    const { data: location } = await supabaseAdmin
      .from('locations')
      .select('name')
      .eq('id', locationId)
      .single();
    const restaurantName = location?.name || '';

    // 5. Calculate recipients: load segment filter or all customers
    let filterRules: any = null;
    if (campaign.segment_id) {
      const { data: segment } = await supabaseAdmin
        .from('marketing_segments')
        .select('filter_rules')
        .eq('id', campaign.segment_id)
        .single();
      filterRules = segment?.filter_rules;
    }

    // Query customers directly (service role bypasses RLS)
    let customerQuery = supabaseAdmin
      .from('customers')
      .select('id, first_name, last_name, email')
      .eq('location_id', locationId)
      .not('email', 'is', null);

    // Apply basic segment filters if present
    if (filterRules?.conditions) {
      for (const cond of filterRules.conditions) {
        const { field, operator, value } = cond;
        switch (field) {
          case 'total_visits':
            if (operator === 'gte') customerQuery = customerQuery.gte('total_visits', value);
            if (operator === 'lte') customerQuery = customerQuery.lte('total_visits', value);
            if (operator === 'eq') customerQuery = customerQuery.eq('total_visits', value);
            break;
          case 'average_spend':
            if (operator === 'gte') customerQuery = customerQuery.gte('average_spend', value);
            if (operator === 'lte') customerQuery = customerQuery.lte('average_spend', value);
            break;
          case 'no_show_count':
            if (operator === 'gte') customerQuery = customerQuery.gte('total_no_shows', value);
            if (operator === 'lte') customerQuery = customerQuery.lte('total_no_shows', value);
            break;
        }
      }
    }

    const { data: allCustomers, error: custErr } = await customerQuery;
    if (custErr) throw custErr;
    if (!allCustomers || allCustomers.length === 0) {
      await supabaseAdmin
        .from('marketing_campaigns')
        .update({ status: 'sent', sent_at: new Date().toISOString(), sent_count: 0 })
        .eq('id', campaign_id);
      return new Response(JSON.stringify({ sent: 0, message: 'No eligible recipients' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Filter on consent: only opted-in customers
    const customerIds = allCustomers.map((c) => c.id);
    const { data: consentRecords } = await supabaseAdmin
      .from('marketing_contact_preferences')
      .select('customer_id')
      .eq('location_id', locationId)
      .eq('channel', 'email')
      .eq('opted_in', true)
      .in('customer_id', customerIds);

    const optedInIds = new Set((consentRecords || []).map((r) => r.customer_id));

    // 7. Filter on suppression: exclude recently emailed
    const suppressionDate = new Date();
    suppressionDate.setDate(suppressionDate.getDate() - maxFreqDays);

    const { data: recentlySent } = await supabaseAdmin
      .from('marketing_email_log')
      .select('customer_id')
      .eq('location_id', locationId)
      .gte('sent_at', suppressionDate.toISOString())
      .in('customer_id', customerIds);

    const suppressedIds = new Set((recentlySent || []).map((r) => r.customer_id));

    // 8. Final recipient list
    const recipients: Recipient[] = allCustomers.filter(
      (c) => c.email && optedInIds.has(c.id) && !suppressedIds.has(c.id)
    ) as Recipient[];

    if (recipients.length === 0) {
      await supabaseAdmin
        .from('marketing_campaigns')
        .update({ status: 'sent', sent_at: new Date().toISOString(), sent_count: 0 })
        .eq('id', campaign_id);
      return new Response(JSON.stringify({ sent: 0, message: 'No eligible recipients after filtering' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 9. Prepare and send
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const verifiedFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
    const fromEmail = `${senderName} <${verifiedFrom}>`;
    const subject = campaign.subject || campaign.name;
    const contentHtml = campaign.content_html || '<p>Geen inhoud</p>';

    let totalSent = 0;
    const BATCH_SIZE = 100;

    // Chunk recipients into batches of 100
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      if (resendApiKey) {
        // Build batch payload
        const emailPayloads = batch.map((r) => {
          const personalizedHtml = personalize(contentHtml, r, restaurantName);
          const finalHtml = addUnsubscribeLink(personalizedHtml, r.id, locationId);
          const payload: any = {
            from: fromEmail,
            to: r.email,
            subject,
            html: finalHtml,
          };
          if (replyTo) payload.reply_to = replyTo;
          return payload;
        });

        try {
          const results = await sendBatch(emailPayloads, resendApiKey);

          // Log each sent email
          const logEntries = batch.map((r, idx) => ({
            campaign_id,
            customer_id: r.id,
            location_id: locationId,
            resend_message_id: results[idx]?.id || null,
            status: 'sent',
            sent_at: new Date().toISOString(),
          }));

          await supabaseAdmin.from('marketing_email_log').insert(logEntries);
          totalSent += batch.length;
        } catch (batchErr) {
          console.error(`[MARKETING] Batch ${i / BATCH_SIZE + 1} failed:`, batchErr);
          // Log failed emails
          const failedEntries = batch.map((r) => ({
            campaign_id,
            customer_id: r.id,
            location_id: locationId,
            status: 'failed',
            sent_at: new Date().toISOString(),
          }));
          await supabaseAdmin.from('marketing_email_log').insert(failedEntries);
        }
      } else {
        // Stub fallback for development
        console.log(`[MARKETING STUB] Would send batch of ${batch.length} emails for campaign ${campaign_id}`);
        batch.forEach((r) => {
          console.log(`  → ${r.email} (${r.first_name} ${r.last_name})`);
        });

        const stubEntries = batch.map((r) => ({
          campaign_id,
          customer_id: r.id,
          location_id: locationId,
          resend_message_id: `stub-${crypto.randomUUID()}`,
          status: 'sent',
          sent_at: new Date().toISOString(),
        }));
        await supabaseAdmin.from('marketing_email_log').insert(stubEntries);
        totalSent += batch.length;
      }
    }

    // 10. Update campaign status + analytics
    await supabaseAdmin
      .from('marketing_campaigns')
      .update({ status: 'sent', sent_at: new Date().toISOString(), sent_count: totalSent })
      .eq('id', campaign_id);

    // Upsert analytics
    await supabaseAdmin
      .from('marketing_campaign_analytics')
      .upsert(
        {
          campaign_id,
          location_id: locationId,
          channel: 'email',
          sent_count: totalSent,
        },
        { onConflict: 'campaign_id,channel' }
      );

    console.log(`[MARKETING] Campaign ${campaign_id} sent to ${totalSent} recipients`);

    return new Response(JSON.stringify({ sent: totalSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[MARKETING] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
