import { supabaseAdmin } from './supabaseAdmin.ts';

/**
 * Claims an idempotency lock. Returns true if claimed (first time), false if already processed.
 */
export async function claimIdempotencyLock(key: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('workflow_executions')
    .insert({
      idempotency_key: key,
      status: 'processing',
    });

  if (error) {
    if (error.code === '23505') {
      console.log(`Idempotency: already processed ${key}`);
      return false;
    }
    throw error;
  }
  return true;
}

/**
 * Marks a workflow execution as completed.
 */
export async function completeExecution(key: string, result?: Record<string, unknown>): Promise<void> {
  await supabaseAdmin
    .from('workflow_executions')
    .update({
      status: 'completed',
      result: result ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('idempotency_key', key);
}

/**
 * Marks a workflow execution as failed.
 */
export async function failExecution(key: string, error: string): Promise<void> {
  await supabaseAdmin
    .from('workflow_executions')
    .update({
      status: 'failed',
      error,
      completed_at: new Date().toISOString(),
    })
    .eq('idempotency_key', key);
}
