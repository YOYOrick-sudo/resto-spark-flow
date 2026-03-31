import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ============================================
// WhatsApp Send via 360dialog
// ============================================

interface WhatsAppSendInput {
  location_id: string;
  phone_number: string;         // E.164 format: +31612345678
  message_type: 'text' | 'template';
  text_body?: string;
  template_name?: string;
  template_language?: string;
  template_components?: any[];
  conversation_id?: string;     // For service window check
}

interface WhatsAppResult {
  success: boolean;
  wa_message_id?: string;
  error?: string;
}

async function canSendFreeText(conversationId: string): Promise<boolean> {
  const { data: conv } = await supabase
    .from('conversations')
    .select('service_window_expires_at, channel')
    .eq('id', conversationId)
    .single();

  if (conv?.channel !== 'whatsapp') return true;
  if (!conv?.service_window_expires_at) return false;
  return new Date(conv.service_window_expires_at) > new Date();
}

async function sendWhatsAppMessage(input: WhatsAppSendInput, retried = false): Promise<WhatsAppResult> {
  const apiKey = Deno.env.get('D360_API_KEY');
  if (!apiKey) {
    return { success: false, error: 'D360_API_KEY not configured' };
  }

  // Service window check for free text
  if (input.message_type === 'text' && input.conversation_id) {
    const canSend = await canSendFreeText(input.conversation_id);
    if (!canSend) {
      return { success: false, error: 'Outside 24h service window — only templates allowed' };
    }
  }

  // Build payload (Meta Cloud API v23.0 compatible)
  const phoneClean = input.phone_number.replace(/^\+/, '');
  const payload: Record<string, any> = {
    messaging_product: 'whatsapp',
    to: phoneClean,
    type: input.message_type,
  };

  if (input.message_type === 'text') {
    payload.text = { body: input.text_body };
  } else if (input.message_type === 'template') {
    payload.template = {
      name: input.template_name,
      language: { code: input.template_language || 'nl' },
      components: input.template_components || [],
    };
  }

  try {
    const response = await fetch('https://waba-v2.360dialog.io/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'D360-API-KEY': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[SEND-WA] 360dialog error ${response.status}: ${errorBody}`);

      // Retry once on rate limit or server error
      if (!retried && (response.status === 429 || response.status >= 500)) {
        await new Promise(r => setTimeout(r, 2000));
        return sendWhatsAppMessage(input, true);
      }

      return { success: false, error: `360dialog ${response.status}: ${errorBody}` };
    }

    const result = await response.json();
    const waMessageId = result.messages?.[0]?.id;

    return { success: true, wa_message_id: waMessageId };
  } catch (err) {
    console.error('[SEND-WA] Network error:', err);
    return { success: false, error: `Network error: ${String(err)}` };
  }
}

// ============================================
// HTTP Handler (for direct calls + testing)
// ============================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input: WhatsAppSendInput = await req.json();

    if (!input.phone_number || !input.message_type) {
      return new Response(
        JSON.stringify({ error: 'phone_number and message_type required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await sendWhatsAppMessage(input);

    // Log to ai_logs if there was an error
    if (!result.success && input.location_id) {
      await supabase.from('ai_logs').insert({
        location_id: input.location_id,
        feature: 'messaging_whatsapp_error',
        model: '360dialog',
        status: 'error',
        error_message: result.error?.slice(0, 500),
      });
    }

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[SEND-WA] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
