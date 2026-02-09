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
 * Sends an email via Resend API, with fallback to stub if RESEND_API_KEY is not set.
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

  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Nesto <onboarding@resend.dev>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
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
