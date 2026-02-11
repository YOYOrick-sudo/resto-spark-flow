import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { claimIdempotencyLock, completeExecution, failExecution } from '../_shared/idempotency.ts';
import { sendEmail } from '../_shared/email.ts';
import { renderTemplate, getEmailTemplates } from '../_shared/templateRenderer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReminderConfig {
  first_reminder_hours: number;
  second_reminder_hours: number;
  no_response_days: number;
  reminder_enabled: boolean;
}

const DEFAULT_CONFIG: ReminderConfig = {
  first_reminder_hours: 24,
  second_reminder_hours: 48,
  no_response_days: 7,
  reminder_enabled: true,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[REMINDERS] Starting reminder check...');

    // Get all locations with onboarding settings
    const { data: settings, error: settingsErr } = await supabaseAdmin
      .from('onboarding_settings')
      .select('location_id, reminder_config, email_templates');

    if (settingsErr) throw settingsErr;
    if (!settings || settings.length === 0) {
      return json({ processed: 0, reason: 'no_locations' });
    }

    let totalReminders = 0;
    let totalEscalations = 0;
    let totalNoResponse = 0;

    for (const setting of settings) {
      const config: ReminderConfig = {
        ...DEFAULT_CONFIG,
        ...(setting.reminder_config as Partial<ReminderConfig> || {}),
      };

      if (!config.reminder_enabled) {
        console.log(`[REMINDERS] Skipping location ${setting.location_id} (disabled)`);
        continue;
      }

      const result = await processLocation(setting.location_id, config, setting.email_templates);
      totalReminders += result.reminders;
      totalEscalations += result.escalations;
      totalNoResponse += result.noResponse;
    }

    console.log(`[REMINDERS] Done. Reminders: ${totalReminders}, Escalations: ${totalEscalations}, No-response: ${totalNoResponse}`);
    return json({ success: true, reminders: totalReminders, escalations: totalEscalations, no_response: totalNoResponse });
  } catch (error) {
    console.error('[REMINDERS] Error:', error);
    return json({ error: error.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── PROCESS LOCATION ──────────────────────────────────

async function processLocation(
  locationId: string,
  config: ReminderConfig,
  emailTemplates: unknown,
): Promise<{ reminders: number; escalations: number; noResponse: number }> {
  let reminders = 0;
  let escalations = 0;
  let noResponse = 0;

  // Get owner email for this location
  const ownerEmail = await getLocationOwnerEmail(locationId);
  if (!ownerEmail) {
    console.log(`[REMINDERS] No owner found for location ${locationId}, skipping`);
    return { reminders, escalations, noResponse };
  }

  // Get pending tasks older than first_reminder_hours
  const cutoffFirst = new Date(Date.now() - config.first_reminder_hours * 60 * 60 * 1000).toISOString();
  const { data: pendingTasks } = await supabaseAdmin
    .from('ob_tasks')
    .select('id, title, candidate_id, phase_id, created_at, is_automated')
    .eq('location_id', locationId)
    .eq('status', 'pending')
    .eq('is_automated', false)
    .lt('created_at', cutoffFirst);

  if (!pendingTasks || pendingTasks.length === 0) {
    // Check no_response separately
    noResponse = await checkNoResponse(locationId, config);
    return { reminders, escalations, noResponse };
  }

  const templates = emailTemplates as Record<string, { subject: string; html_body: string }> | null;

  for (const task of pendingTasks) {
    // Get phase owner email (fallback to location owner)
    const recipientEmail = await getTaskRecipientEmail(task.phase_id, locationId, ownerEmail);

    // Count existing reminders for this task
    const { count } = await supabaseAdmin
      .from('onboarding_events')
      .select('id', { count: 'exact', head: true })
      .eq('candidate_id', task.candidate_id)
      .eq('location_id', locationId)
      .eq('event_type', 'reminder_sent')
      .filter('event_data->>task_id', 'eq', task.id);

    const reminderCount = count || 0;
    const taskAgeHours = (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60);

    if (reminderCount === 0 && taskAgeHours >= config.first_reminder_hours) {
      const key = `reminder:${task.id}:1`;
      if (await claimIdempotencyLock(key)) {
        try {
          await sendReminderEmail(task, locationId, recipientEmail, 'internal_reminder', templates);
          await logReminderEvent(task, locationId, 1);
          await completeExecution(key, { reminder_number: 1 });
          reminders++;
        } catch (e) {
          await failExecution(key, e.message);
        }
      }
    } else if (reminderCount === 1 && taskAgeHours >= config.second_reminder_hours) {
      const key = `reminder:${task.id}:2`;
      if (await claimIdempotencyLock(key)) {
        try {
          await sendReminderEmail(task, locationId, recipientEmail, 'internal_reminder_urgent', templates);
          await logReminderEvent(task, locationId, 2);
          await completeExecution(key, { reminder_number: 2, escalated: true });
          escalations++;
        } catch (e) {
          await failExecution(key, e.message);
        }
      }
    }
  }

  noResponse = await checkNoResponse(locationId, config);
  return { reminders, escalations, noResponse };
}

// ─── NO RESPONSE CHECK ─────────────────────────────────

async function checkNoResponse(locationId: string, config: ReminderConfig): Promise<number> {
  // Find candidates in phase with sort_order = 20 (Screening) for longer than no_response_days
  const cutoff = new Date(Date.now() - config.no_response_days * 24 * 60 * 60 * 1000).toISOString();

  const { data: candidates } = await supabaseAdmin
    .from('onboarding_candidates')
    .select('id, current_phase_id')
    .eq('location_id', locationId)
    .eq('status', 'active')
    .not('current_phase_id', 'is', null);

  if (!candidates || candidates.length === 0) return 0;

  let count = 0;
  for (const candidate of candidates) {
    // Check if the current phase is Screening (sort_order = 20)
    const { data: phase } = await supabaseAdmin
      .from('onboarding_phases')
      .select('sort_order')
      .eq('id', candidate.current_phase_id!)
      .single();

    if (phase?.sort_order !== 20) continue;

    // Check how long they've been in this phase via phase_logs
    const { data: log } = await supabaseAdmin
      .from('onboarding_phase_logs')
      .select('entered_at')
      .eq('candidate_id', candidate.id)
      .eq('phase_id', candidate.current_phase_id!)
      .is('exited_at', null)
      .single();

    if (!log || log.entered_at > cutoff) continue;

    // Mark as no_response
    const key = `no_response:${candidate.id}`;
    if (await claimIdempotencyLock(key)) {
      try {
        await supabaseAdmin
          .from('onboarding_candidates')
          .update({ status: 'no_response', updated_at: new Date().toISOString() })
          .eq('id', candidate.id);

        await supabaseAdmin.from('onboarding_events').insert({
          candidate_id: candidate.id,
          location_id: locationId,
          event_type: 'auto_status_change',
          event_data: { new_status: 'no_response', reason: 'no_progress_in_screening', days: config.no_response_days },
          triggered_by: 'cron',
        });

        await completeExecution(key, { status: 'no_response' });
        count++;
        console.log(`[REMINDERS] Candidate ${candidate.id} marked as no_response`);
      } catch (e) {
        await failExecution(key, e.message);
      }
    }
  }
  return count;
}

// ─── HELPERS ────────────────────────────────────────────

async function getTaskRecipientEmail(
  phaseId: string,
  locationId: string,
  fallbackEmail: string,
): Promise<string> {
  const { data: phase } = await supabaseAdmin
    .from('onboarding_phases')
    .select('phase_owner_email')
    .eq('id', phaseId)
    .single();

  if (phase?.phase_owner_email) {
    return phase.phase_owner_email;
  }
  return fallbackEmail;
}

async function getLocationOwnerEmail(locationId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('user_location_roles')
    .select('user_id')
    .eq('location_id', locationId)
    .eq('role', 'owner')
    .limit(1)
    .single();

  if (!data) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', data.user_id)
    .single();

  return profile?.email || null;
}

async function sendReminderEmail(
  task: { id: string; title: string; candidate_id: string },
  locationId: string,
  toEmail: string,
  templateKey: string,
  templates: Record<string, { subject: string; html_body: string }> | null,
) {
  if (!templates?.[templateKey]) {
    console.log(`[REMINDERS] No template '${templateKey}' found, skipping email`);
    return;
  }

  // Get candidate info for template rendering
  const { data: candidate } = await supabaseAdmin
    .from('onboarding_candidates')
    .select('first_name, last_name, location:locations!onboarding_candidates_location_id_fkey(name)')
    .eq('id', task.candidate_id)
    .single();

  if (!candidate) return;

  const context = {
    voornaam: candidate.first_name,
    achternaam: candidate.last_name,
    vestiging: (candidate as any).location?.name || '',
    functie: '',
  };

  const template = templates[templateKey];
  await sendEmail({
    to: toEmail,
    subject: renderTemplate(template.subject, context),
    html: renderTemplate(template.html_body, context),
    candidateId: task.candidate_id,
    locationId,
    emailType: templateKey,
  });
}

async function logReminderEvent(
  task: { id: string; title: string; candidate_id: string },
  locationId: string,
  reminderNumber: number,
) {
  await supabaseAdmin.from('onboarding_events').insert({
    candidate_id: task.candidate_id,
    location_id: locationId,
    event_type: 'reminder_sent',
    event_data: { task_id: task.id, task_title: task.title, reminder_number: reminderNumber },
    triggered_by: 'cron',
  });
}
