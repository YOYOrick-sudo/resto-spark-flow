import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    // 1. Expire sent invites past their expiry
    const { data: expiredInvites } = await admin
      .from('waitlist_invites')
      .update({ status: 'expired' })
      .eq('status', 'sent')
      .lt('expires_at', now)
      .select('id, waitlist_entry_id, location_id, slot_date');

    const affectedLocDates = new Set<string>();

    if (expiredInvites && expiredInvites.length > 0) {
      // Reset entries back to pending
      const entryIds = expiredInvites.map(i => i.waitlist_entry_id);
      await admin
        .from('waitlist_entries')
        .update({ status: 'pending' })
        .in('id', entryIds);

      // Audit log for each expired invite
      const auditEntries = expiredInvites.map(inv => ({
        location_id: inv.location_id,
        entity_type: 'waitlist_invite',
        entity_id: inv.id,
        action: 'waitlist_invite_expired',
        actor_type: 'system',
        changes: { reason: 'auto_expire_timeout' },
      }));
      await admin.from('audit_log').insert(auditEntries);

      for (const inv of expiredInvites) {
        affectedLocDates.add(`${inv.location_id}:${inv.slot_date}`);
      }

      console.log(`[AUTO-EXPIRE] Expired ${expiredInvites.length} invites`);
    }

    // 2. Expire old pending entries (date < today)
    const { data: expiredEntries } = await admin
      .from('waitlist_entries')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('date', today)
      .select('id, location_id');

    if (expiredEntries && expiredEntries.length > 0) {
      console.log(`[AUTO-EXPIRE] Expired ${expiredEntries.length} old entries`);
    }

    // 3. Trigger waitlist-invite-engine for affected location+date combos
    const baseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    for (const key of affectedLocDates) {
      const [locationId, date] = key.split(':');
      try {
        await fetch(`${baseUrl}/functions/v1/waitlist-invite-engine`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ location_id: locationId, date }),
        });
        console.log(`[AUTO-EXPIRE] Triggered invite-engine for ${locationId} ${date}`);
      } catch (e) {
        console.error(`[AUTO-EXPIRE] Failed to trigger invite-engine:`, e);
      }
    }

    return new Response(JSON.stringify({
      expired_invites: expiredInvites?.length || 0,
      expired_entries: expiredEntries?.length || 0,
      retriggered: affectedLocDates.size,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('[AUTO-EXPIRE] Error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
