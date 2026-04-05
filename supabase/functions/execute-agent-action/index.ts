import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── AUTONOMY SUGGESTION CHECK ───

async function checkAutonomySuggestion(locationId: string, actionType: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data } = await supabase
    .from('agent_feedback')
    .select('feedback_type')
    .eq('location_id', locationId)
    .gte('created_at', thirtyDaysAgo);

  if (!data) return;

  const approved = data.filter(f => f.feedback_type === 'approved').length;
  const rejected = data.filter(f => f.feedback_type === 'rejected').length;
  const total = approved + rejected;

  // 20+ decisions, 90%+ approved → suggestion
  if (total >= 20 && (approved / total) >= 0.9) {
    // Map action_type to task_key
    const taskKey = actionType.startsWith('whatsapp_') ? actionType : `whatsapp_${actionType}`;

    // Check if suggestion already exists
    const { data: existing } = await supabase
      .from('agent_actions')
      .select('id')
      .eq('action_type', 'autonomy_suggestion')
      .eq('location_id', locationId)
      .in('status', ['concept', 'goedgekeurd'])
      .limit(1)
      .maybeSingle();

    if (!existing) {
      await supabase.from('agent_actions').insert({
        location_id: locationId,
        action_type: 'autonomy_suggestion',
        title: `Je hebt ${approved} van ${total} keer goedgekeurd`,
        beschrijving: `Zal ik dit voortaan zelf afhandelen?`,
        status: 'concept',
        action_data: { task_key: taskKey, approved, total },
      });
    }
  }
}

// ─── MAIN HANDLER ───

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { action_id, user_id } = await req.json();
    if (!action_id) return json({ error: 'action_id required' }, 400);

    // 1. Get the action
    const { data: action, error: actionErr } = await supabase
      .from('agent_actions')
      .select('*')
      .eq('id', action_id)
      .single();

    if (actionErr || !action) return json({ error: 'Action not found' }, 404);
    if (action.status !== 'concept') return json({ error: 'Action already processed' }, 400);

    // 2. Update status to approved
    await supabase.from('agent_actions').update({
      status: 'goedgekeurd',
      goedgekeurd_door: user_id || null,
      goedgekeurd_op: new Date().toISOString(),
    }).eq('id', action_id);

    // 3. Record feedback
    if (user_id) {
      await supabase.from('agent_feedback').insert({
        location_id: action.location_id,
        action_id: action_id,
        feedback_type: 'approved',
        given_by: user_id,
      });
    }

    // 4. Execute the underlying action based on type
    const actionData = action.action_data as any;

    if (action.action_type === 'knowledge_gap' && actionData?.question) {
      // For knowledge gaps, the approval means "I'll add this later" — no auto-execution needed
      console.log(`[EXECUTE-ACTION] Knowledge gap acknowledged: ${actionData.question}`);
    } else if (action.action_type === 'autonomy_suggestion' && actionData?.task_key) {
      // Upgrade autonomy level
      const { error } = await supabase
        .from('agent_configurations')
        .update({ autonomy_level: 'autonomous' })
        .eq('location_id', action.location_id)
        .eq('task_key', actionData.task_key);

      if (error) {
        // Insert if not exists
        await supabase.from('agent_configurations').insert({
          location_id: action.location_id,
          task_key: actionData.task_key,
          autonomy_level: 'autonomous',
          is_enabled: true,
        });
      }
      console.log(`[EXECUTE-ACTION] Autonomy upgraded: ${actionData.task_key} → autonomous`);
    } else if (actionData?.conversation_id) {
      // For booking-related actions, send confirmation to guest
      const conversationId = actionData.conversation_id;

      // Send a confirmation message via ai-respond or direct
      const confirmMessage = getConfirmationMessage(action.action_type, actionData);
      if (confirmMessage) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          location_id: action.location_id,
          channel: 'whatsapp',
          direction: 'outbound',
          message_type: 'text',
          content: confirmMessage,
          is_ai_generated: true,
        });

        // If WhatsApp, actually send
        const { data: conv } = await supabase
          .from('conversations')
          .select('channel, channel_contact_id')
          .eq('id', conversationId)
          .single();

        if (conv?.channel === 'whatsapp' && conv?.channel_contact_id) {
          await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
            body: JSON.stringify({
              location_id: action.location_id,
              phone_number: `+${conv.channel_contact_id}`,
              message_type: 'text',
              text_body: confirmMessage,
              conversation_id: conversationId,
            }),
          });
        }
      }
    }

    // 5. Check for autonomy suggestion
    await checkAutonomySuggestion(action.location_id, action.action_type);

    return json({ success: true });
  } catch (err) {
    console.error('[EXECUTE-ACTION] Error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});

function getConfirmationMessage(actionType: string, data: any): string | null {
  switch (actionType) {
    case 'cancel_reservation':
      return 'Je reservering is geannuleerd. We hopen je snel weer te zien!';
    case 'modify_reservation':
      return 'Je reservering is aangepast. Je ontvangt zo een bevestiging.';
    case 'create_reservation':
      return 'Je reservering is bevestigd! Je ontvangt zo een bevestiging.';
    case 'escalation':
      return 'Een collega neemt het gesprek over. Even geduld!';
    default:
      return null;
  }
}
