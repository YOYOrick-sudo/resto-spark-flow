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
 * Email stub — logs to console and onboarding_events. Real implementation in a later step (Resend).
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
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
}
