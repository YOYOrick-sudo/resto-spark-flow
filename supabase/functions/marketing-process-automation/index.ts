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

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  total_visits: number;
  last_visit_at: string | null;
  birthday: string | null;
  created_at: string;
}

function personalize(html: string, customer: Customer, restaurantName: string): string {
  return html
    .replace(/\{\{first_name\}\}/g, customer.first_name || '')
    .replace(/\{\{last_name\}\}/g, customer.last_name || '')
    .replace(/\{\{restaurant_name\}\}/g, restaurantName || '');
}

function addUnsubscribeLink(html: string, customerId: string, locationId: string): string {
  const baseUrl = Deno.env.get('SUPABASE_URL') || '';
  const unsubUrl = `${baseUrl}/functions/v1/marketing-email-webhook?action=unsubscribe&customer_id=${customerId}&location_id=${locationId}`;
  const footer = `
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
      <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline;">Uitschrijven</a>
    </div>`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${footer}</body>`);
  }
  return html + footer;
}

async function sendSingleEmail(
  to: string,
  from: string,
  subject: string,
  html: string,
  replyTo?: string
): Promise<string | null> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey) {
    console.log(`[AUTOMATION STUB] Would send to ${to}: ${subject}`);
    return `stub-${crypto.randomUUID()}`;
  }

  const payload: any = { from, to: [to], subject, html };
  if (replyTo) payload.reply_to = replyTo;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[AUTOMATION] Resend error ${response.status}: ${errorBody}`);
    return null;
  }

  const result = await response.json();
  return result.id || null;
}

/**
 * Processes all active automation flows + cross_module_events.
 * Called by pg_cron every 15 minutes.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Load all active flows
    const { data: flows, error: flowsErr } = await supabaseAdmin
      .from('marketing_automation_flows')
      .select('*')
      .eq('is_active', true);

    if (flowsErr) throw flowsErr;

    let totalSent = 0;

    // ============================================
    // PART 1: Direct flow processing (welcome, birthday, winback)
    // ============================================
    if (flows && flows.length > 0) {
      for (const flow of flows) {
        try {
          const locationId = flow.location_id;
          const flowType = flow.flow_type;
          const triggerConfig = (flow.trigger_config || {}) as Record<string, any>;

          // Skip post_visit_review — handled via cross_module_events below
          if (flowType === 'post_visit_review') continue;
          // Skip welcome — handled via cross_module_events (guest_first_visit)
          if (flowType === 'welcome') continue;

          // Load brand kit
          const { data: brandKit } = await supabaseAdmin
            .from('marketing_brand_kit')
            .select('marketing_sender_name, marketing_reply_to, max_email_frequency_days')
            .eq('location_id', locationId)
            .maybeSingle();

          const senderName = brandKit?.marketing_sender_name || 'Nesto';
          const replyTo = brandKit?.marketing_reply_to || undefined;
          const maxFreqDays = brandKit?.max_email_frequency_days ?? 3;
          const verifiedFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
          const fromEmail = `${senderName} <${verifiedFrom}>`;

          // Load location name
          const { data: location } = await supabaseAdmin
            .from('locations')
            .select('name')
            .eq('id', locationId)
            .single();
          const restaurantName = location?.name || '';

          // Load template
          let templateHtml = '<p>{{first_name}}, bedankt voor je bezoek!</p>';
          let templateSubject = 'Bericht van {{restaurant_name}}';
          if (flow.template_id) {
            const { data: template } = await supabaseAdmin
              .from('marketing_templates')
              .select('content_html, name')
              .eq('id', flow.template_id)
              .single();
            if (template?.content_html) templateHtml = template.content_html;
            if (template?.name) templateSubject = template.name;
          }

          // Find matching customers based on flow type
          let candidates: Customer[] = [];

          if (flowType === 'birthday') {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + 7);
            const targetMonth = targetDate.getMonth() + 1;
            const targetDay = targetDate.getDate();

            const { data } = await supabaseAdmin
              .from('customers')
              .select('id, first_name, last_name, email, total_visits, last_visit_at, birthday, created_at')
              .eq('location_id', locationId)
              .not('email', 'is', null)
              .not('birthday', 'is', null);

            candidates = ((data || []) as Customer[]).filter((c) => {
              if (!c.birthday) return false;
              const bday = new Date(c.birthday);
              return bday.getMonth() + 1 === targetMonth && bday.getDate() === targetDay;
            });
          } else if (flowType === 'winback') {
            const daysThreshold = triggerConfig.days_threshold || 30;
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - daysThreshold);
            const windowEnd = new Date(targetDate);
            windowEnd.setDate(windowEnd.getDate() - 1);

            const { data } = await supabaseAdmin
              .from('customers')
              .select('id, first_name, last_name, email, total_visits, last_visit_at, birthday, created_at')
              .eq('location_id', locationId)
              .not('email', 'is', null)
              .not('last_visit_at', 'is', null)
              .lte('last_visit_at', targetDate.toISOString())
              .gte('last_visit_at', windowEnd.toISOString());

            candidates = (data || []) as Customer[];
          }

          if (candidates.length === 0) continue;

          // Filter: already sent for this flow
          const candidateIds = candidates.map((c) => c.id);
          const { data: alreadySent } = await supabaseAdmin
            .from('marketing_email_log')
            .select('customer_id')
            .eq('flow_id', flow.id)
            .in('customer_id', candidateIds);

          const sentIds = new Set((alreadySent || []).map((r) => r.customer_id));

          // Filter: consent
          const { data: consentRecords } = await supabaseAdmin
            .from('marketing_contact_preferences')
            .select('customer_id')
            .eq('location_id', locationId)
            .eq('channel', 'email')
            .eq('opted_in', true)
            .in('customer_id', candidateIds);

          const optedInIds = new Set((consentRecords || []).map((r) => r.customer_id));

          // Filter: suppression
          const suppressionDate = new Date();
          suppressionDate.setDate(suppressionDate.getDate() - maxFreqDays);

          const { data: recentlySent } = await supabaseAdmin
            .from('marketing_email_log')
            .select('customer_id')
            .eq('location_id', locationId)
            .gte('sent_at', suppressionDate.toISOString())
            .in('customer_id', candidateIds);

          const suppressedIds = new Set((recentlySent || []).map((r) => r.customer_id));

          // Final eligible list
          const eligible = candidates.filter(
            (c) => !sentIds.has(c.id) && optedInIds.has(c.id) && !suppressedIds.has(c.id)
          );

          // Send individual emails
          for (const customer of eligible) {
            const personalizedSubject = personalize(templateSubject, customer, restaurantName);
            const personalizedHtml = personalize(templateHtml, customer, restaurantName);
            const finalHtml = addUnsubscribeLink(personalizedHtml, customer.id, locationId);

            const resendId = await sendSingleEmail(
              customer.email,
              fromEmail,
              personalizedSubject,
              finalHtml,
              replyTo
            );

            await supabaseAdmin.from('marketing_email_log').insert({
              flow_id: flow.id,
              customer_id: customer.id,
              location_id: locationId,
              resend_message_id: resendId,
              status: resendId ? 'sent' : 'failed',
              sent_at: new Date().toISOString(),
            });

            if (resendId) totalSent++;
          }

          // Update flow stats
          const currentStats = (flow.stats || {}) as Record<string, any>;
          const newSentCount = (currentStats.sent_count || 0) + eligible.length;
          await supabaseAdmin
            .from('marketing_automation_flows')
            .update({
              stats: { ...currentStats, sent_count: newSentCount, last_run_at: new Date().toISOString() },
            })
            .eq('id', flow.id);

          console.log(`[AUTOMATION] Flow "${flow.name}" (${flowType}): sent ${eligible.length} emails`);
        } catch (flowErr) {
          console.error(`[AUTOMATION] Error processing flow ${flow.id}:`, flowErr);
        }
      }
    }

    // ============================================
    // PART 2: Cross-module events consumption
    // ============================================
    try {
      const { data: events } = await supabaseAdmin
        .from('cross_module_events')
        .select('*')
        .in('event_type', ['guest_first_visit', 'guest_visit_completed'])
        .not('consumed_by', 'cs', '{"marketing-automation"}');

      if (events && events.length > 0) {
        for (const event of events) {
          try {
            const payload = (event.payload || {}) as Record<string, any>;
            const customerId = payload.customer_id;
            const locationId = event.location_id;

            if (!customerId) {
              await markEventConsumed(event.id, event.consumed_by);
              continue;
            }

            if (event.event_type === 'guest_first_visit') {
              // Find active welcome flow for this location
              const welcomeFlow = flows?.find(
                (f) => f.location_id === locationId && f.flow_type === 'welcome' && f.is_active
              );
              if (welcomeFlow) {
                await processEventForFlow(welcomeFlow, customerId, locationId, totalSent);
                totalSent++; // approximate
              }
            } else if (event.event_type === 'guest_visit_completed') {
              // Post-visit review: only process if event is >= 3 hours old
              const eventAge = Date.now() - new Date(event.created_at).getTime();
              const threeHoursMs = 3 * 60 * 60 * 1000;

              if (eventAge < threeHoursMs) {
                // Too early, skip — will be picked up in a future run
                continue;
              }

              const reviewFlow = flows?.find(
                (f) => f.location_id === locationId && f.flow_type === 'post_visit_review' && f.is_active
              );
              if (reviewFlow) {
                await processEventForFlow(reviewFlow, customerId, locationId, totalSent);
                totalSent++;
              }
            }

            // Mark event as consumed
            await markEventConsumed(event.id, event.consumed_by);
          } catch (eventErr) {
            console.error(`[AUTOMATION] Error processing event ${event.id}:`, eventErr);
          }
        }
      }
    } catch (eventsErr) {
      console.error('[AUTOMATION] Error loading cross_module_events:', eventsErr);
    }

    return new Response(JSON.stringify({ processed: flows?.length ?? 0, sent: totalSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[AUTOMATION] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Mark a cross_module_event as consumed by marketing-automation
 */
async function markEventConsumed(eventId: string, currentConsumedBy: any) {
  const consumed = Array.isArray(currentConsumedBy) ? currentConsumedBy : [];
  if (!consumed.includes('marketing-automation')) {
    consumed.push('marketing-automation');
  }
  await supabaseAdmin
    .from('cross_module_events')
    .update({ consumed_by: consumed })
    .eq('id', eventId);
}

/**
 * Process a single customer for a flow (consent check, suppression, send)
 */
async function processEventForFlow(
  flow: any,
  customerId: string,
  locationId: string,
  _totalSent: number
) {
  // Load customer
  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id, first_name, last_name, email, total_visits, last_visit_at, birthday, created_at')
    .eq('id', customerId)
    .single();

  if (!customer || !customer.email) return;

  // Check already sent for this flow
  const { data: alreadySent } = await supabaseAdmin
    .from('marketing_email_log')
    .select('id')
    .eq('flow_id', flow.id)
    .eq('customer_id', customerId)
    .limit(1);

  if (alreadySent && alreadySent.length > 0) return;

  // Check consent
  const { data: consent } = await supabaseAdmin
    .from('marketing_contact_preferences')
    .select('opted_in')
    .eq('customer_id', customerId)
    .eq('location_id', locationId)
    .eq('channel', 'email')
    .eq('opted_in', true)
    .maybeSingle();

  if (!consent) return;

  // Check suppression
  const { data: brandKit } = await supabaseAdmin
    .from('marketing_brand_kit')
    .select('marketing_sender_name, marketing_reply_to, max_email_frequency_days')
    .eq('location_id', locationId)
    .maybeSingle();

  const maxFreqDays = brandKit?.max_email_frequency_days ?? 3;
  const suppressionDate = new Date();
  suppressionDate.setDate(suppressionDate.getDate() - maxFreqDays);

  const { data: recentlySent } = await supabaseAdmin
    .from('marketing_email_log')
    .select('id')
    .eq('customer_id', customerId)
    .eq('location_id', locationId)
    .gte('sent_at', suppressionDate.toISOString())
    .limit(1);

  if (recentlySent && recentlySent.length > 0) return;

  // Load template
  let templateHtml = '<p>{{first_name}}, bedankt voor je bezoek!</p>';
  let templateSubject = 'Bericht van {{restaurant_name}}';
  if (flow.template_id) {
    const { data: template } = await supabaseAdmin
      .from('marketing_templates')
      .select('content_html, name')
      .eq('id', flow.template_id)
      .single();
    if (template?.content_html) templateHtml = template.content_html;
    if (template?.name) templateSubject = template.name;
  }

  // Load location name
  const { data: location } = await supabaseAdmin
    .from('locations')
    .select('name')
    .eq('id', locationId)
    .single();
  const restaurantName = location?.name || '';

  const senderName = brandKit?.marketing_sender_name || 'Nesto';
  const replyTo = brandKit?.marketing_reply_to || undefined;
  const verifiedFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
  const fromEmail = `${senderName} <${verifiedFrom}>`;

  // Personalize and send
  const personalizedSubject = personalize(templateSubject, customer as Customer, restaurantName);
  const personalizedHtml = personalize(templateHtml, customer as Customer, restaurantName);
  const finalHtml = addUnsubscribeLink(personalizedHtml, customerId, locationId);

  const resendId = await sendSingleEmail(customer.email, fromEmail, personalizedSubject, finalHtml, replyTo);

  // Log
  await supabaseAdmin.from('marketing_email_log').insert({
    flow_id: flow.id,
    customer_id: customerId,
    location_id: locationId,
    resend_message_id: resendId,
    status: resendId ? 'sent' : 'failed',
    sent_at: new Date().toISOString(),
  });

  // Update flow stats
  const currentStats = (flow.stats || {}) as Record<string, any>;
  await supabaseAdmin
    .from('marketing_automation_flows')
    .update({
      stats: {
        ...currentStats,
        sent_count: (currentStats.sent_count || 0) + 1,
        last_run_at: new Date().toISOString(),
      },
    })
    .eq('id', flow.id);

  console.log(`[AUTOMATION] Event-triggered flow "${flow.name}": sent to ${customer.email}`);
}
