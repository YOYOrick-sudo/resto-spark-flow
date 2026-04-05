import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── SIGNATURE VERIFICATIE ───

function verifySignature(rawBody: string, signatureHeader: string): boolean {
  const appSecret = Deno.env.get('META_APP_SECRET');
  if (!appSecret || !signatureHeader) return false;

  try {
    const encoder = new TextEncoder();
    const key = encoder.encode(appSecret);
    const data = encoder.encode(rawBody);

    // Use Web Crypto API (Deno compatible)
    // For sync HMAC we use a simple approach
    const expected = signatureHeader;
    
    // In Deno, we need async crypto - but we'll validate in processWebhook instead
    // For now, check format
    return expected.startsWith('sha256=');
  } catch {
    return false;
  }
}

async function verifySignatureAsync(rawBody: string, signatureHeader: string): Promise<boolean> {
  const appSecret = Deno.env.get('META_APP_SECRET');
  if (!appSecret || !signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(appSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    const hexHash = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const expected = `sha256=${hexHash}`;
    
    // Constant-time comparison
    if (expected.length !== signatureHeader.length) return false;
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
    }
    return mismatch === 0;
  } catch (err) {
    console.error('[WA-WEBHOOK] Signature verification error:', err);
    return false;
  }
}

// ─── MAIN HANDLER ───

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // ── GET: Webhook verificatie challenge ──
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) {
      console.log('[WA-WEBHOOK] Webhook verified successfully');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // ── POST: Inkomende events ──
  if (req.method === 'POST') {
    const rawBody = await req.text();

    // Verify signature (skip if META_APP_SECRET not configured yet)
    const signature = req.headers.get('X-Hub-Signature-256') || '';
    const appSecret = Deno.env.get('META_APP_SECRET');
    
    if (appSecret) {
      const valid = await verifySignatureAsync(rawBody, signature);
      if (!valid) {
        console.error('[WA-WEBHOOK] Invalid webhook signature');
        return new Response('Invalid signature', { status: 403 });
      }
    } else {
      console.warn('[WA-WEBHOOK] META_APP_SECRET not configured — skipping signature verification');
    }

    // Parse and process in background, return 200 immediately
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    // Use EdgeRuntime.waitUntil for background processing
    const processing = processWebhook(body);
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(processing);
    } else {
      // Fallback: await directly
      await processing;
    }

    return new Response('OK', { status: 200 });
  }

  return new Response('Method not allowed', { status: 405 });
});

// ─── WEBHOOK VERWERKING (achtergrond) ───

async function processWebhook(body: any) {
  try {
    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== 'messages') continue;
        const value = change.value;

        // Bepaal location op basis van phone_number_id
        const phoneNumberId = value.metadata?.phone_number_id;
        const location = await getLocationByPhoneNumberId(phoneNumberId);
        if (!location) {
          console.error(`[WA-WEBHOOK] No location found for phone_number_id: ${phoneNumberId}`);
          continue;
        }

        // Verwerk inkomende berichten
        if (value.messages?.length) {
          for (const message of value.messages) {
            await processInboundMessage(location, value, message);
          }
        }

        // Verwerk status updates
        if (value.statuses?.length) {
          for (const status of value.statuses) {
            await processStatusUpdate(status);
          }
        }
      }
    }
  } catch (err) {
    console.error('[WA-WEBHOOK] Processing error:', err);
  }
}

// ─── LOCATIE LOOKUP ───

async function getLocationByPhoneNumberId(phoneNumberId: string) {
  if (!phoneNumberId) return null;

  const { data } = await supabase
    .from('locations')
    .select('id, name, organization_id, whatsapp_enabled')
    .eq('whatsapp_phone_number_id', phoneNumberId)
    .single();

  if (!data?.whatsapp_enabled) return null;
  return data;
}

// ─── INBOUND BERICHT VERWERKEN ───

async function processInboundMessage(location: any, value: any, message: any) {
  const senderPhone = message.from; // E.164 zonder +
  const senderName = value.contacts?.[0]?.profile?.name || senderPhone;
  const waMessageId = message.id;

  // Idempotency check
  const { data: existing } = await supabase
    .from('messages')
    .select('id')
    .eq('wa_message_id', waMessageId)
    .maybeSingle();

  if (existing) return;

  // Zoek of maak customer
  const customer = await findOrCreateCustomer(location.id, senderPhone, senderName);

  // Zoek of maak conversation
  const conversation = await findOrCreateConversation(location.id, customer?.id, senderPhone);

  // Update service window (24 uur vanaf nu)
  await supabase
    .from('conversations')
    .update({
      service_window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      last_message_at: new Date().toISOString(),
      unread_count: (conversation.unread_count || 0) + 1,
      status: conversation.status === 'closed' ? 'active' : conversation.status,
    })
    .eq('id', conversation.id);

  // Bepaal berichtinhoud
  const content = extractMessageContent(message);

  // Sla bericht op
  const { error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      location_id: location.id,
      channel: 'whatsapp',
      direction: 'inbound',
      message_type: message.type || 'text',
      content: content,
      wa_message_id: waMessageId,
      wa_status: 'delivered',
      is_ai_generated: false,
    });

  if (error) {
    // Duplicate wa_message_id (idempotency via unique constraint)
    if (error.code === '23505') return;
    console.error('[WA-WEBHOOK] Error inserting message:', error);
  } else {
    console.log(`[WA-WEBHOOK] Inbound from +${senderPhone} for ${location.name}`);

    // Trigger AI agent if enabled
    try {
      const { data: msgConfig } = await supabase
        .from('messaging_config')
        .select('ai_agent_enabled')
        .eq('location_id', location.id)
        .maybeSingle();

      if (msgConfig?.ai_agent_enabled && conversation.handled_by === 'ai') {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-respond`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            conversation_id: conversation.id,
            message_id: 'wa_inbound',
            location_id: location.id,
          }),
        });
      }
    } catch (aiErr) {
      console.error('[WA-WEBHOOK] AI trigger error:', aiErr);
    }
  }
}

// ─── CUSTOMER ZOEKEN OF AANMAKEN ───

async function findOrCreateCustomer(locationId: string, phone: string, name: string) {
  const phoneE164 = phone.startsWith('+') ? phone : `+${phone}`;
  const nameParts = name.split(' ');

  // Upsert: insert or update on conflict (location_id, phone_number)
  const { data: customer } = await supabase
    .from('customers')
    .upsert({
      location_id: locationId,
      first_name: nameParts[0] || name,
      last_name: nameParts.slice(1).join(' ') || '',
      phone_number: phoneE164,
      whatsapp_opt_in: true,
    }, { onConflict: 'location_id,phone_number' })
    .select('id')
    .single();

  return customer;
}

// ─── CONVERSATION ZOEKEN OF AANMAKEN ───

async function findOrCreateConversation(locationId: string, customerId: string | null, phone: string) {
  // Zoek actieve conversation voor dit telefoonnummer
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('location_id', locationId)
    .eq('channel', 'whatsapp')
    .eq('channel_contact_id', phone)
    .in('status', ['active', 'escalated'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  // Maak nieuwe conversation aan
  const { data: newConv } = await supabase
    .from('conversations')
    .insert({
      location_id: locationId,
      customer_id: customerId,
      channel: 'whatsapp',
      channel_contact_id: phone,
      status: 'active',
      handled_by: 'ai',
      last_message_at: new Date().toISOString(),
      service_window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('*')
    .single();

  return newConv;
}

// ─── BERICHTINHOUD EXTRACTEN ───

function extractMessageContent(message: any): string {
  switch (message.type) {
    case 'text':
      return message.text?.body || '';
    case 'interactive':
      return message.interactive?.button_reply?.title
        || message.interactive?.list_reply?.title
        || '';
    case 'image':
      return message.image?.caption || '[Afbeelding ontvangen]';
    case 'document':
      return message.document?.caption || '[Document ontvangen]';
    case 'audio':
      return '[Spraakbericht ontvangen]';
    case 'video':
      return message.video?.caption || '[Video ontvangen]';
    case 'location':
      return `[Locatie: ${message.location?.latitude}, ${message.location?.longitude}]`;
    case 'button':
      return message.button?.text || '';
    default:
      return `[${message.type || 'onbekend'} bericht]`;
  }
}

// ─── STATUS UPDATES VERWERKEN ───

async function processStatusUpdate(status: any) {
  const waMessageId = status.id;
  const newStatus = status.status; // sent, delivered, read, failed

  if (!waMessageId || !newStatus) return;

  const updates: Record<string, any> = {
    wa_status: newStatus,
  };

  if (newStatus === 'failed') {
    updates.wa_error_code = status.errors?.[0]?.code?.toString() || 'unknown';
  }

  if (newStatus === 'read') {
    updates.read_at = new Date().toISOString();
  }

  await supabase
    .from('messages')
    .update(updates)
    .eq('wa_message_id', waMessageId);
}
