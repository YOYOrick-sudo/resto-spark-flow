import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { claimIdempotencyLock, completeExecution, failExecution } from '../_shared/idempotency.ts';
import { sendEmail } from '../_shared/email.ts';
import { renderTemplate, getEmailTemplates } from '../_shared/templateRenderer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AgentEvent {
  type: 'candidate_created' | 'phase_changed' | 'candidate_rejected' | 'task_completed';
  candidate_id: string;
  location_id: string;
  old_phase_id?: string;
  new_phase_id?: string;
  task_id?: string;
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
    const event: AgentEvent = await req.json();
    console.log(`[AGENT] Received event: ${event.type} for candidate ${event.candidate_id}`);

    if (!event.type || !event.candidate_id || !event.location_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, candidate_id, location_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (event.type) {
      case 'candidate_created':
        await handleCandidateCreated(event);
        break;
      case 'phase_changed':
        await handlePhaseChanged(event);
        break;
      case 'candidate_rejected':
        await handleCandidateRejected(event);
        break;
      case 'task_completed':
        await handleTaskCompleted(event);
        break;
      default:
        console.log(`[AGENT] Unknown event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[AGENT] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ─── HANDLERS ───────────────────────────────────────────

async function handleCandidateCreated(event: AgentEvent) {
  const idempotencyKey = `candidate_created:${event.candidate_id}`;
  if (!(await claimIdempotencyLock(idempotencyKey))) return;

  try {
    const { data: candidate } = await supabaseAdmin
      .from('onboarding_candidates')
      .select('*, location:locations!onboarding_candidates_location_id_fkey(name)')
      .eq('id', event.candidate_id)
      .single();

    if (!candidate) {
      await failExecution(idempotencyKey, 'Candidate not found');
      return;
    }

    const templates = await getEmailTemplates(event.location_id);

    if (templates?.confirmation) {
      const context = {
        voornaam: candidate.first_name,
        achternaam: candidate.last_name,
        vestiging: (candidate as any).location?.name || '',
        functie: '',
      };

      await sendEmail({
        to: candidate.email,
        subject: renderTemplate(templates.confirmation.subject, context),
        html: renderTemplate(templates.confirmation.html_body, context),
        candidateId: candidate.id,
        locationId: event.location_id,
        emailType: 'confirmation',
      });
    }

    await completeAutomatedTasks(event.candidate_id, event.location_id);
    await completeExecution(idempotencyKey, { email_sent: !!templates?.confirmation });
  } catch (error) {
    await failExecution(idempotencyKey, error.message);
    throw error;
  }
}

async function handlePhaseChanged(event: AgentEvent) {
  const idempotencyKey = `phase_changed:${event.candidate_id}:${event.new_phase_id}`;
  if (!(await claimIdempotencyLock(idempotencyKey))) return;

  try {
    await completeAutomatedTasks(event.candidate_id, event.location_id);
    console.log(`[AGENT] Phase changed to ${event.new_phase_id} for candidate ${event.candidate_id}`);
    await completeExecution(idempotencyKey);
  } catch (error) {
    await failExecution(idempotencyKey, error.message);
    throw error;
  }
}

async function handleCandidateRejected(event: AgentEvent) {
  const idempotencyKey = `candidate_rejected:${event.candidate_id}`;
  if (!(await claimIdempotencyLock(idempotencyKey))) return;

  try {
    const { data: candidate } = await supabaseAdmin
      .from('onboarding_candidates')
      .select('*, location:locations!onboarding_candidates_location_id_fkey(name)')
      .eq('id', event.candidate_id)
      .single();

    if (!candidate) {
      await failExecution(idempotencyKey, 'Candidate not found');
      return;
    }

    const templates = await getEmailTemplates(event.location_id);

    if (templates?.rejection) {
      const context = {
        voornaam: candidate.first_name,
        achternaam: candidate.last_name,
        vestiging: (candidate as any).location?.name || '',
        functie: '',
      };

      await sendEmail({
        to: candidate.email,
        subject: renderTemplate(templates.rejection.subject, context),
        html: renderTemplate(templates.rejection.html_body, context),
        candidateId: candidate.id,
        locationId: event.location_id,
        emailType: 'rejection',
      });
    }

    await completeExecution(idempotencyKey, { email_sent: !!templates?.rejection });
  } catch (error) {
    await failExecution(idempotencyKey, error.message);
    throw error;
  }
}

async function handleTaskCompleted(event: AgentEvent) {
  console.log(`[AGENT] Task completed: ${event.task_id} for candidate ${event.candidate_id}`);
}

// ─── HELPERS ────────────────────────────────────────────

async function completeAutomatedTasks(candidateId: string, locationId: string) {
  const { data: candidate } = await supabaseAdmin
    .from('onboarding_candidates')
    .select('current_phase_id')
    .eq('id', candidateId)
    .single();

  if (!candidate?.current_phase_id) return;

  const { data: updatedTasks, error } = await supabaseAdmin
    .from('ob_tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('candidate_id', candidateId)
    .eq('phase_id', candidate.current_phase_id)
    .eq('is_automated', true)
    .eq('status', 'pending')
    .select();

  if (error) {
    console.error('[AGENT] Error completing automated tasks:', error);
    return;
  }

  if (updatedTasks && updatedTasks.length > 0) {
    const events = updatedTasks.map(task => ({
      candidate_id: candidateId,
      location_id: locationId,
      event_type: 'task_completed',
      event_data: { task_id: task.id, task_title: task.title, automated: true },
      triggered_by: 'agent',
    }));

    await supabaseAdmin.from('onboarding_events').insert(events);
    console.log(`[AGENT] Completed ${updatedTasks.length} automated tasks for candidate ${candidateId}`);
  }
}
