import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const { manage_token, content } = await req.json();

    if (!manage_token || typeof manage_token !== 'string') {
      return json({ error: 'manage_token is required' }, 400);
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      return json({ error: 'content is required' }, 400);
    }
    if (content.length > 2000) {
      return json({ error: 'Message too long (max 2000 characters)' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Validate manage_token → reservation
    const { data: reservation, error: resErr } = await supabase
      .from('reservations')
      .select('id, location_id, customer_id')
      .eq('manage_token', manage_token)
      .single();

    if (resErr || !reservation) {
      return json({ error: 'Invalid token' }, 403);
    }

    // 2. Find or create webchat conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id, unread_count')
      .eq('location_id', reservation.location_id)
      .eq('channel', 'webchat')
      .eq('channel_contact_id', manage_token)
      .in('status', ['active', 'escalated'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conversation) {
      const { data: newConv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          location_id: reservation.location_id,
          customer_id: reservation.customer_id,
          channel: 'webchat',
          channel_contact_id: manage_token,
          status: 'active',
          handled_by: 'ai',
          reservation_id: reservation.id,
          last_message_at: new Date().toISOString(),
          unread_count: 0,
        })
        .select('id, unread_count')
        .single();

      if (convErr || !newConv) {
        console.error('[WEBCHAT] Failed to create conversation:', convErr);
        return json({ error: 'Failed to create conversation' }, 500);
      }
      conversation = newConv;
    }

    // 3. Insert message
    const { data: message, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        location_id: reservation.location_id,
        channel: 'webchat',
        direction: 'inbound',
        message_type: 'text',
        content: content.trim(),
        is_ai_generated: false,
        reservation_id: reservation.id,
      })
      .select('id')
      .single();

    if (msgErr) {
      console.error('[WEBCHAT] Failed to insert message:', msgErr);
      return json({ error: 'Failed to send message' }, 500);
    }

    // 4. Update conversation
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        unread_count: (conversation.unread_count || 0) + 1,
      })
      .eq('id', conversation.id);

    // Trigger AI agent if enabled
    try {
      const { data: msgConfig } = await supabase
        .from('messaging_config')
        .select('ai_agent_enabled')
        .eq('location_id', reservation.location_id)
        .maybeSingle();

      const { data: conv } = await supabase
        .from('conversations')
        .select('handled_by')
        .eq('id', conversation.id)
        .single();

      if (msgConfig?.ai_agent_enabled && conv?.handled_by === 'ai') {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-respond`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            conversation_id: conversation.id,
            message_id: message?.id,
            location_id: reservation.location_id,
          }),
        });
      }
    } catch (aiErr) {
      console.error('[WEBCHAT] AI trigger error:', aiErr);
    }

    return json({
      success: true,
      message_id: message?.id,
      conversation_id: conversation.id,
    });
  } catch (err) {
    console.error('[WEBCHAT] Error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
