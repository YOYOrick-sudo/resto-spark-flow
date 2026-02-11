import { supabaseAdmin } from './supabaseAdmin.ts';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  candidateId: string;
  locationId: string;
  emailType: string;
}

/**
 * Fetches location-specific email config (sender_name, reply_to) from communication_settings.
 */
async function getEmailConfig(locationId: string): Promise<{ sender_name?: string; reply_to?: string }> {
  const { data, error } = await supabaseAdmin
    .from('communication_settings')
    .select('sender_name, reply_to')
    .eq('location_id', locationId)
    .maybeSingle();

  if (error || !data) {
    return {};
  }

  return {
    sender_name: data.sender_name || undefined,
    reply_to: data.reply_to || undefined,
  };
}

/**
 * Sends an email via Resend API, with fallback to stub if RESEND_API_KEY is not set.
 * Uses location-specific sender_name and reply_to from onboarding_settings.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey) {
    // Stub fallback — development without Resend
    console.log(`[EMAIL STUB] To: ${params.to}, Subject: ${params.subject}, Type: ${params.emailType}`);
    await supabaseAdmin.from('onboarding_events').insert({
      candidate_id: params.candidateId,
      location_id: params.locationId,
      event_type: 'email_sent',
      event_data: {
        email_type: params.emailType,
        to: params.to,
        subject: params.subject,
        stub: true,
      },
      triggered_by: 'agent',
    });
    return;
  }

  // Fetch location-specific email config
  const emailConfig = await getEmailConfig(params.locationId);

  const defaultFrom = Deno.env.get('RESEND_FROM_EMAIL') || 'Nesto <onboarding@resend.dev>';
  const fromEmail = emailConfig.sender_name
    ? `${emailConfig.sender_name} <noreply@nesto.app>`
    : defaultFrom;

  try {
    const payload: Record<string, unknown> = {
      from: fromEmail,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    };

    if (emailConfig.reply_to) {
      payload.reply_to = emailConfig.reply_to;
    }

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
      console.error(`[EMAIL] Resend API error ${response.status}: ${errorBody}`);
      await supabaseAdmin.from('onboarding_events').insert({
        candidate_id: params.candidateId,
        location_id: params.locationId,
        event_type: 'email_failed',
        event_data: {
          email_type: params.emailType,
          to: params.to,
          subject: params.subject,
          error: `${response.status}: ${errorBody}`,
        },
        triggered_by: 'agent',
      });
      return;
    }

    const result = await response.json();
    console.log(`[EMAIL] Sent via Resend: ${result.id} to ${params.to}`);

    await supabaseAdmin.from('onboarding_events').insert({
      candidate_id: params.candidateId,
      location_id: params.locationId,
      event_type: 'email_sent',
      event_data: {
        email_type: params.emailType,
        to: params.to,
        subject: params.subject,
        stub: false,
        resend_id: result.id,
      },
      triggered_by: 'agent',
    });
  } catch (error) {
    console.error(`[EMAIL] Exception sending email:`, error);
    await supabaseAdmin.from('onboarding_events').insert({
      candidate_id: params.candidateId,
      location_id: params.locationId,
      event_type: 'email_failed',
      event_data: {
        email_type: params.emailType,
        to: params.to,
        subject: params.subject,
        error: error.message,
      },
      triggered_by: 'agent',
    });
  }
}
