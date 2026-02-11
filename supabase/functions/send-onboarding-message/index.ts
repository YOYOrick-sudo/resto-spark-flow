import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SendMessagePayload {
  candidate_id: string;
  subject: string;
  body_html: string;
  body_text?: string;
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
    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: SendMessagePayload = await req.json();
    const { candidate_id, subject, body_html, body_text } = payload;

    if (!candidate_id || !subject || !body_html) {
      return new Response(JSON.stringify({ error: 'Missing required fields: candidate_id, subject, body_html' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch candidate
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('onboarding_candidates')
      .select('id, email, first_name, last_name, location_id, status')
      .eq('id', candidate_id)
      .single();

    if (candidateError || !candidate) {
      return new Response(JSON.stringify({ error: 'Candidate not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch communication settings for sender info
    const { data: commSettings } = await supabaseAdmin
      .from('communication_settings')
      .select('sender_name, reply_to')
      .eq('location_id', candidate.location_id)
      .maybeSingle();

    // Fetch sender profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('name, email')
      .eq('id', user.id)
      .single();

    const senderName = commSettings?.sender_name || profile?.name || 'Nesto';
    const senderEmail = profile?.email || user.email || 'noreply@nesto.app';
    const fromEmail = commSettings?.sender_name
      ? `${commSettings.sender_name} <noreply@nesto.app>`
      : `${senderName} <noreply@nesto.app>`;

    // Send via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    let resendMessageId: string | null = null;

    if (resendApiKey) {
      const resendPayload: Record<string, unknown> = {
        from: fromEmail,
        to: [candidate.email],
        subject,
        html: body_html,
      };

      if (commSettings?.reply_to) {
        resendPayload.reply_to = commSettings.reply_to;
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resendPayload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[SEND-MSG] Resend error ${response.status}: ${errorBody}`);
        return new Response(JSON.stringify({ error: 'Failed to send email' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await response.json();
      resendMessageId = result.id;
      console.log(`[SEND-MSG] Email sent via Resend: ${result.id}`);
    } else {
      console.log(`[SEND-MSG] STUB: To ${candidate.email}, Subject: ${subject}`);
    }

    // Save to onboarding_messages
    const { data: message, error: insertError } = await supabaseAdmin
      .from('onboarding_messages')
      .insert({
        candidate_id,
        location_id: candidate.location_id,
        direction: 'outbound',
        sender_name: profile?.name || senderName,
        sender_email: senderEmail,
        subject,
        body_html,
        body_text: body_text || null,
        resend_message_id: resendMessageId,
        triggered_by: 'user',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[SEND-MSG] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log event
    await supabaseAdmin.from('onboarding_events').insert({
      candidate_id,
      location_id: candidate.location_id,
      event_type: 'email_sent',
      event_data: {
        email_type: 'manual',
        to: candidate.email,
        subject,
        message_id: message.id,
        stub: !resendApiKey,
      },
      triggered_by: 'user',
      actor_id: user.id,
    });

    return new Response(JSON.stringify({ success: true, message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[SEND-MSG] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
