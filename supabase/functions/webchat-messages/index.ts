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

  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const url = new URL(req.url);
    const manageToken = url.searchParams.get('token');

    if (!manageToken) {
      return json({ error: 'Token required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Validate token
    const { data: reservation } = await supabase
      .from('reservations')
      .select('id, location_id')
      .eq('manage_token', manageToken)
      .single();

    if (!reservation) {
      return json({ error: 'Invalid token' }, 403);
    }

    // Find conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('location_id', reservation.location_id)
      .eq('channel', 'webchat')
      .eq('channel_contact_id', manageToken)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conversation) {
      return json({ messages: [], conversation_id: null });
    }

    // Get messages — IMPORTANT: do NOT expose is_ai_generated
    const { data: messages } = await supabase
      .from('messages')
      .select('id, direction, content, message_type, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(100);

    return json({
      messages: messages || [],
      conversation_id: conversation.id,
    });
  } catch (err) {
    console.error('[WEBCHAT-MESSAGES] Error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
