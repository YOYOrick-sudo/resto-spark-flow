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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============================================
// Hardcoded default templates (fallback)
// ============================================

const DEFAULT_TEMPLATES: Record<string, Record<string, { subject?: string; body: string }>> = {
  reservation_confirmation: {
    whatsapp: {
      body: 'Hoi {{naam}}! Je reservering bij {{restaurant}} is bevestigd: {{datum}} om {{tijd}}, {{personen}} personen. Heb je nog vragen? Antwoord gerust op dit bericht!',
    },
    email: {
      subject: 'Bevestiging: {{restaurant}} op {{datum}} om {{tijd}}',
      body: 'Beste {{naam}}, uw reservering bij {{restaurant}} is bevestigd.\n\nDatum: {{datum}}\nTijd: {{tijd}}\nGasten: {{personen}} personen\n\nVia onderstaande link kunt u uw reservering beheren.',
    },
  },
  reminder_24h: {
    whatsapp: {
      body: 'Herinnering: morgen om {{tijd}} verwachten we je bij {{restaurant}} met {{personen}} personen. Tot dan!',
    },
    email: {
      subject: 'Herinnering: je reservering morgen bij {{restaurant}}',
      body: 'Beste {{naam}}, dit is een herinnering voor uw reservering morgen bij {{restaurant}}.\n\nTijd: {{tijd}}\nAantal: {{personen}} personen.',
    },
  },
  reminder_3h: {
    whatsapp: {
      body: 'Vanavond om {{tijd}} verwachten we je bij {{restaurant}}. Tot zo!',
    },
    email: {
      subject: 'Vanavond: je reservering bij {{restaurant}} om {{tijd}}',
      body: 'Beste {{naam}}, nog even ter herinnering — je reservering is vandaag.\n\nTijd: {{tijd}}\nGasten: {{personen}} personen.\n\nTot straks.',
    },
  },
  reservation_reconfirm: {
    whatsapp: {
      body: 'Hoi {{naam}}, kun je bevestigen dat je morgen om {{tijd}} bij {{restaurant}} komt met {{personen}} personen? Antwoord "Ja" of "Nee".',
    },
    email: {
      subject: 'Bevestig je reservering bij {{restaurant}}',
      body: 'Beste {{naam}}, kunt u bevestigen dat u morgen om {{tijd}} bij {{restaurant}} aanwezig bent?\n\nBevestig via onderstaande link.',
    },
  },
  waitlist_invite: {
    whatsapp: {
      body: 'Goed nieuws {{naam}}! Er is een plek vrijgekomen bij {{restaurant}} op {{datum}} om {{tijd}}. Wil je deze reservering? Antwoord "Ja" om te bevestigen!',
    },
    email: {
      subject: 'Er is een plek vrijgekomen bij {{restaurant}}',
      body: 'Beste {{naam}}, er is een plek vrijgekomen bij {{restaurant}} op {{datum}} om {{tijd}}.\n\nBevestig via onderstaande link.',
    },
  },
  reservation_cancelled: {
    whatsapp: {
      body: 'Hoi {{naam}}, je reservering bij {{restaurant}} op {{datum}} om {{tijd}} is geannuleerd. We hopen je snel weer te zien!',
    },
    email: {
      subject: 'Annulering: {{restaurant}} op {{datum}}',
      body: 'Beste {{naam}}, uw reservering bij {{restaurant}} op {{datum}} om {{tijd}} is geannuleerd.',
    },
  },
  webchat_new_reply: {
    email: {
      subject: 'Nieuw bericht van {{restaurant}}',
      body: 'Hoi {{naam}}, je hebt een nieuw bericht van {{restaurant}} over je reservering. Bekijk het via onderstaande link.',
    },
  },
};

// Templates that should be sent via BOTH channels when primary = whatsapp
const DUAL_DELIVERY_TEMPLATES = [
  'reservation_confirmation',
  'reminder_24h',
  'reservation_reconfirm',
  'waitlist_invite',
  'payment_request',
];

// Templates that are WhatsApp-only (no email fallback/dual)
const WHATSAPP_ONLY_TEMPLATES = ['reminder_3h'];

// ============================================
// Helpers
// ============================================

interface SendMessageInput {
  location_id: string;
  customer_id: string;
  template_key: string;
  template_params: Record<string, string>;
  reservation_id?: string;
  force_channel?: 'whatsapp' | 'email';
}

function replacePlaceholders(text: string, params: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(params)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

async function selectChannel(input: SendMessageInput): Promise<'whatsapp' | 'email'> {
  if (input.force_channel) return input.force_channel;

  const { data: location } = await supabase
    .from('locations')
    .select('whatsapp_enabled')
    .eq('id', input.location_id)
    .single();

  if (!location?.whatsapp_enabled) return 'email';

  const { data: customer } = await supabase
    .from('customers')
    .select('whatsapp_opt_in, phone_number')
    .eq('id', input.customer_id)
    .single();

  if (!customer?.whatsapp_opt_in || !customer?.phone_number) return 'email';

  return 'whatsapp';
}

async function getTemplate(
  locationId: string,
  templateKey: string,
  channel: 'whatsapp' | 'email',
  language = 'nl'
): Promise<{ subject?: string; body: string; wa_template_name?: string } | null> {
  // Try message_templates table first
  const { data } = await supabase
    .from('message_templates')
    .select('subject, body, wa_template_name')
    .eq('location_id', locationId)
    .eq('template_key', templateKey)
    .eq('channel', channel)
    .eq('language', language)
    .eq('is_active', true)
    .maybeSingle();

  if (data) return data;

  // Fallback to hardcoded defaults
  const defaults = DEFAULT_TEMPLATES[templateKey];
  if (defaults?.[channel]) {
    return { ...defaults[channel] };
  }

  return null;
}

async function getOrCreateConversation(
  locationId: string,
  customerId: string,
  channel: 'whatsapp' | 'email',
  reservationId?: string
): Promise<string> {
  // Try to find existing active conversation
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('location_id', locationId)
    .eq('customer_id', customerId)
    .eq('channel', channel === 'email' ? 'webchat' : channel) // emails go under webchat conversation
    .eq('status', 'active')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  // Create new conversation
  const { data: conv } = await supabase
    .from('conversations')
    .insert({
      location_id: locationId,
      customer_id: customerId,
      channel: channel === 'email' ? 'webchat' : channel,
      reservation_id: reservationId,
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  return conv!.id;
}

async function logMessage(
  conversationId: string,
  locationId: string,
  channel: 'whatsapp' | 'email',
  templateKey: string,
  templateParams: Record<string, string>,
  body: string,
  reservationId?: string,
  waMessageId?: string,
  isAiGenerated = false
) {
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    location_id: locationId,
    channel: channel === 'email' ? 'webchat' : channel,
    direction: 'outbound',
    message_type: 'template',
    content: body,
    template_name: templateKey,
    template_params: templateParams,
    wa_message_id: waMessageId,
    wa_status: waMessageId ? 'sent' : null,
    is_ai_generated: isAiGenerated,
    reservation_id: reservationId,
  });

  // Update conversation last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);
}

async function sendViaWhatsApp(
  locationId: string,
  phoneNumber: string,
  template: { body: string; wa_template_name?: string },
  renderedBody: string,
  templateParams: Record<string, string>,
  conversationId?: string
): Promise<{ success: boolean; wa_message_id?: string; error?: string }> {
  try {
    const input: Record<string, any> = {
      location_id: locationId,
      phone_number: phoneNumber,
      message_type: template.wa_template_name ? 'template' : 'text',
      conversation_id: conversationId,
    };

    if (template.wa_template_name) {
      // Build template components from params
      const bodyParams = Object.values(templateParams).map(v => ({
        type: 'text',
        text: v,
      }));
      input.template_name = template.wa_template_name;
      input.template_language = 'nl';
      input.template_components = bodyParams.length > 0
        ? [{ type: 'body', parameters: bodyParams }]
        : [];
    } else {
      input.text_body = renderedBody;
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(input),
    });

    const result = await response.json();
    return result;
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function sendViaEmail(
  locationId: string,
  reservationId: string | undefined,
  templateKey: string
): Promise<{ success: boolean; error?: string }> {
  // Map template_keys to send-reservation-email template_keys
  const emailKeyMap: Record<string, string> = {
    reservation_confirmation: 'confirmation',
    reminder_24h: 'reminder_24h',
    reminder_3h: 'reminder_3h',
    reservation_reconfirm: 'reconfirm',
    waitlist_invite: 'waitlist_invite',
    reservation_cancelled: 'cancellation',
  };

  const emailKey = emailKeyMap[templateKey] || templateKey;

  if (!reservationId) {
    console.warn(`[SEND-MSG] No reservation_id for email send of ${templateKey}`);
    return { success: false, error: 'No reservation_id for email' };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-reservation-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        reservation_id: reservationId,
        template_key: emailKey,
      }),
    });

    const result = await response.json();
    return { success: response.ok, error: result.error };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ============================================
// Main Handler
// ============================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input: SendMessageInput = await req.json();

    if (!input.location_id || !input.customer_id || !input.template_key || !input.template_params) {
      return new Response(
        JSON.stringify({ error: 'location_id, customer_id, template_key, and template_params required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Select channel
    let channel = await selectChannel(input);
    let whatsAppFailed = false;

    // 2. Get template
    const template = await getTemplate(input.location_id, input.template_key, channel);
    if (!template) {
      // If no template for this channel, try the other
      const fallbackChannel = channel === 'whatsapp' ? 'email' : 'whatsapp';
      const fallbackTemplate = await getTemplate(input.location_id, input.template_key, fallbackChannel);
      if (!fallbackTemplate) {
        return new Response(
          JSON.stringify({ error: `No template found for ${input.template_key}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      channel = fallbackChannel as 'whatsapp' | 'email';
    }

    const activeTemplate = template || (await getTemplate(input.location_id, input.template_key, channel))!;
    const renderedBody = replacePlaceholders(activeTemplate.body, input.template_params);

    // 3. Get or create conversation
    const conversationId = await getOrCreateConversation(
      input.location_id,
      input.customer_id,
      channel,
      input.reservation_id
    );

    // 4. Send via primary channel
    let primaryResult: { success: boolean; wa_message_id?: string; error?: string } = { success: false };

    if (channel === 'whatsapp') {
      // Get customer phone
      const { data: customer } = await supabase
        .from('customers')
        .select('phone_number')
        .eq('id', input.customer_id)
        .single();

      if (customer?.phone_number) {
        primaryResult = await sendViaWhatsApp(
          input.location_id,
          customer.phone_number,
          activeTemplate,
          renderedBody,
          input.template_params,
          conversationId
        );

        if (!primaryResult.success) {
          // WhatsApp failed — log error and fall back to email
          whatsAppFailed = true;
          console.warn(`[SEND-MSG] WhatsApp failed for ${input.template_key}: ${primaryResult.error}. Falling back to email.`);

          await supabase.from('ai_logs').insert({
            location_id: input.location_id,
            feature: 'messaging_whatsapp_error',
            model: '360dialog',
            status: 'error',
            error_message: (primaryResult.error || 'Unknown error').slice(0, 500),
          });

          // Fall back to email
          channel = 'email';
          primaryResult = await sendViaEmail(input.location_id, input.reservation_id, input.template_key);
        }
      } else {
        // No phone number — fall back to email
        channel = 'email';
        primaryResult = await sendViaEmail(input.location_id, input.reservation_id, input.template_key);
      }
    } else {
      // Email
      primaryResult = await sendViaEmail(input.location_id, input.reservation_id, input.template_key);
    }

    // 5. Log the message
    await logMessage(
      conversationId,
      input.location_id,
      channel,
      input.template_key,
      input.template_params,
      renderedBody,
      input.reservation_id,
      primaryResult.wa_message_id,
      true
    );

    // 6. Dual delivery: if primary was WhatsApp and succeeded, also send email
    if (
      channel === 'whatsapp' &&
      primaryResult.success &&
      !whatsAppFailed &&
      DUAL_DELIVERY_TEMPLATES.includes(input.template_key)
    ) {
      // Also send via email as backup/archive
      const emailResult = await sendViaEmail(input.location_id, input.reservation_id, input.template_key);
      if (!emailResult.success) {
        console.warn(`[SEND-MSG] Dual delivery email failed: ${emailResult.error}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: primaryResult.success,
        channel,
        whatsapp_fallback_to_email: whatsAppFailed,
        wa_message_id: primaryResult.wa_message_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[SEND-MSG] Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
