import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ============================================
// PROVIDER INTERFACE
// ============================================

interface SignalDraft {
  organization_id: string;
  location_id: string;
  module: string;
  signal_type: string;
  kind: 'signal' | 'insight';
  severity: 'info' | 'warning' | 'error' | 'ok';
  title: string;
  message?: string;
  action_path?: string;
  payload?: Record<string, unknown>;
  dedup_key: string;
  actionable: boolean;
  priority: number;
  cooldown_hours?: number;
}

interface SignalProvider {
  name: string;
  evaluate(locationId: string, orgId: string): Promise<SignalDraft[]>;
  resolveStale(locationId: string): Promise<string[]>;
}

// ============================================
// ENTITLEMENT HELPER
// ============================================

async function hasReservationsEntitlement(locationId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('location_entitlements')
    .select('id')
    .eq('location_id', locationId)
    .eq('module_key', 'reservations')
    .eq('enabled', true)
    .maybeSingle();
  return !!data;
}

// ============================================
// CONFIG SIGNAL PROVIDER
// ============================================

const configProvider: SignalProvider = {
  name: 'config',

  async evaluate(locationId: string, orgId: string): Promise<SignalDraft[]> {
    const drafts: SignalDraft[] = [];

    // Entitlement guard: skip all reservation-related checks if not enabled
    const hasRes = await hasReservationsEntitlement(locationId);
    if (!hasRes) return drafts;

    // 1. Unassigned tables: active tables in inactive areas
    const { data: unassignedTables } = await supabaseAdmin
      .from('tables')
      .select('id, area_id, areas!inner(is_active)')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .eq('areas.is_active', false);

    if (unassignedTables && unassignedTables.length > 0) {
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'configuratie',
        signal_type: 'unassigned_tables',
        kind: 'signal',
        severity: 'warning',
        title: `${unassignedTables.length} tafel(s) in gearchiveerde area`,
        message: 'Actieve tafels staan in een gearchiveerde area en zijn niet zichtbaar voor reserveringen.',
        action_path: '/instellingen/reserveringen/tafels',
        dedup_key: `unassigned_tables:${locationId}`,
        actionable: true,
        priority: 30,
        payload: { count: unassignedTables.length },
      });
    }

    // 2. Empty table groups
    const { data: groups } = await supabaseAdmin
      .from('table_groups')
      .select('id, name, table_group_members(id)')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .eq('is_system_generated', false);

    const emptyGroups = (groups || []).filter(
      (g: any) => !g.table_group_members || g.table_group_members.length === 0
    );

    if (emptyGroups.length > 0) {
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'configuratie',
        signal_type: 'empty_table_groups',
        kind: 'signal',
        severity: 'warning',
        title: `${emptyGroups.length} tafelgroep(en) zonder leden`,
        message: `Groepen zonder tafels: ${emptyGroups.map((g: any) => g.name).join(', ')}`,
        action_path: '/instellingen/reserveringen/tafels/groepen',
        dedup_key: `empty_table_groups:${locationId}`,
        actionable: true,
        priority: 40,
        payload: { count: emptyGroups.length, names: emptyGroups.map((g: any) => g.name) },
      });
    }

    // 3. Shifts without pacing
    const { data: shifts } = await supabaseAdmin
      .from('shifts')
      .select('id, name, arrival_interval_minutes')
      .eq('location_id', locationId)
      .eq('is_active', true);

    const noPacingShifts = (shifts || []).filter(
      (s: any) => s.arrival_interval_minutes === 0
    );

    if (noPacingShifts.length > 0) {
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'configuratie',
        signal_type: 'shifts_without_pacing',
        kind: 'signal',
        severity: 'info',
        title: `${noPacingShifts.length} shift(s) zonder pacing`,
        message: `Shifts zonder arrival interval: ${noPacingShifts.map((s: any) => s.name).join(', ')}`,
        action_path: '/instellingen/reserveringen/shifts',
        dedup_key: `shifts_without_pacing:${locationId}`,
        actionable: true,
        priority: 60,
        payload: { count: noPacingShifts.length },
      });
    }

    // ============================================
    // NEW: Ticket & Shift coupling signals
    // ============================================

    // 4. config_ticket_no_shift: active tickets without shift_tickets
    const { data: ticketsNoShift } = await supabaseAdmin
      .from('tickets')
      .select('id, name, shift_tickets(id)')
      .eq('location_id', locationId)
      .eq('status', 'active');

    const orphanTickets = (ticketsNoShift || []).filter(
      (t: any) => !t.shift_tickets || t.shift_tickets.length === 0
    );

    if (orphanTickets.length > 0) {
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'configuratie',
        signal_type: 'config_ticket_no_shift',
        kind: 'signal',
        severity: 'warning',
        title: `${orphanTickets.length} ticket(s) zonder shift`,
        message: `Tickets zonder shift-koppeling: ${orphanTickets.map((t: any) => t.name).join(', ')}`,
        action_path: '/instellingen/reserveringen/tickets',
        dedup_key: `config_ticket_no_shift:${locationId}`,
        actionable: true,
        priority: 25,
        payload: { count: orphanTickets.length, names: orphanTickets.map((t: any) => t.name) },
      });
    }

    // 5. config_shift_no_tickets: active shifts without shift_tickets
    const { data: shiftsNoTickets } = await supabaseAdmin
      .from('shifts')
      .select('id, name, shift_tickets(id)')
      .eq('location_id', locationId)
      .eq('is_active', true);

    const orphanShifts = (shiftsNoTickets || []).filter(
      (s: any) => !s.shift_tickets || s.shift_tickets.length === 0
    );

    if (orphanShifts.length > 0) {
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'configuratie',
        signal_type: 'config_shift_no_tickets',
        kind: 'signal',
        severity: 'warning',
        title: `${orphanShifts.length} shift(s) zonder tickets`,
        message: `Shifts zonder ticket-koppeling: ${orphanShifts.map((s: any) => s.name).join(', ')}`,
        action_path: '/instellingen/reserveringen/shifts',
        dedup_key: `config_shift_no_tickets:${locationId}`,
        actionable: true,
        priority: 25,
        payload: { count: orphanShifts.length, names: orphanShifts.map((s: any) => s.name) },
      });
    }

    // 6. config_ticket_no_policy: active tickets without policy_set
    const { data: ticketsNoPolicy } = await supabaseAdmin
      .from('tickets')
      .select('id, name')
      .eq('location_id', locationId)
      .eq('status', 'active')
      .is('policy_set_id', null);

    if (ticketsNoPolicy && ticketsNoPolicy.length > 0) {
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'configuratie',
        signal_type: 'config_ticket_no_policy',
        kind: 'signal',
        severity: 'info',
        title: `${ticketsNoPolicy.length} ticket(s) zonder beleid`,
        message: `Tickets zonder beleid: ${ticketsNoPolicy.map((t: any) => t.name).join(', ')}`,
        action_path: '/instellingen/reserveringen/tickets',
        dedup_key: `config_ticket_no_policy:${locationId}`,
        actionable: true,
        priority: 50,
        payload: { count: ticketsNoPolicy.length, names: ticketsNoPolicy.map((t: any) => t.name) },
      });
    }

    // 7. config_ticket_draft: draft tickets older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: staleDrafts } = await supabaseAdmin
      .from('tickets')
      .select('id, name')
      .eq('location_id', locationId)
      .eq('status', 'draft')
      .lt('created_at', sevenDaysAgo.toISOString());

    if (staleDrafts && staleDrafts.length > 0) {
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'configuratie',
        signal_type: 'config_ticket_draft',
        kind: 'signal',
        severity: 'info',
        title: `${staleDrafts.length} draft ticket(s) ouder dan 7 dagen`,
        message: `Drafts die mogelijk vergeten zijn: ${staleDrafts.map((t: any) => t.name).join(', ')}`,
        action_path: '/instellingen/reserveringen/tickets',
        dedup_key: `config_ticket_draft:${locationId}`,
        actionable: true,
        priority: 70,
        payload: { count: staleDrafts.length, names: staleDrafts.map((t: any) => t.name) },
      });
    }

    // 8. config_squeeze_no_limit: squeeze enabled without limit
    const { data: squeezeNoLimit } = await supabaseAdmin
      .from('shift_tickets')
      .select('id, shifts!inner(name, is_active)')
      .eq('location_id', locationId)
      .eq('squeeze_enabled', true)
      .is('squeeze_limit_per_shift', null)
      .eq('shifts.is_active', true);

    if (squeezeNoLimit && squeezeNoLimit.length > 0) {
      const shiftNames = [...new Set((squeezeNoLimit as any[]).map(st => st.shifts?.name).filter(Boolean))];
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'configuratie',
        signal_type: 'config_squeeze_no_limit',
        kind: 'signal',
        severity: 'info',
        title: `Squeeze zonder limiet in ${shiftNames.length} shift(s)`,
        message: `Shifts met ongelimiteerde squeeze: ${shiftNames.join(', ')}`,
        action_path: '/instellingen/reserveringen/shifts',
        dedup_key: `config_squeeze_no_limit:${locationId}`,
        actionable: true,
        priority: 60,
        payload: { count: squeezeNoLimit.length, names: shiftNames },
      });
    }

    return drafts;
  },

  async resolveStale(locationId: string): Promise<string[]> {
    const resolved: string[] = [];

    // Skip resolve checks if no reservation entitlement
    const hasRes = await hasReservationsEntitlement(locationId);
    if (!hasRes) {
      // Resolve ALL reservation-related signals if entitlement is gone
      return [
        'unassigned_tables', 'empty_table_groups', 'shifts_without_pacing',
        'config_ticket_no_shift', 'config_shift_no_tickets', 'config_ticket_no_policy',
        'config_ticket_draft', 'config_squeeze_no_limit',
      ];
    }

    // Check unassigned_tables
    const { data: unassigned } = await supabaseAdmin
      .from('tables')
      .select('id, areas!inner(is_active)')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .eq('areas.is_active', false);

    if (!unassigned || unassigned.length === 0) {
      resolved.push('unassigned_tables');
    }

    // Check empty_table_groups
    const { data: groups } = await supabaseAdmin
      .from('table_groups')
      .select('id, table_group_members(id)')
      .eq('location_id', locationId)
      .eq('is_active', true)
      .eq('is_system_generated', false);

    const emptyGroups = (groups || []).filter(
      (g: any) => !g.table_group_members || g.table_group_members.length === 0
    );
    if (emptyGroups.length === 0) {
      resolved.push('empty_table_groups');
    }

    // Check shifts_without_pacing
    const { data: shifts } = await supabaseAdmin
      .from('shifts')
      .select('id, arrival_interval_minutes')
      .eq('location_id', locationId)
      .eq('is_active', true);

    const noPacing = (shifts || []).filter((s: any) => s.arrival_interval_minutes === 0);
    if (noPacing.length === 0) {
      resolved.push('shifts_without_pacing');
    }

    // Check config_ticket_no_shift
    const { data: ticketsNoShift } = await supabaseAdmin
      .from('tickets')
      .select('id, shift_tickets(id)')
      .eq('location_id', locationId)
      .eq('status', 'active');

    const orphanTickets = (ticketsNoShift || []).filter(
      (t: any) => !t.shift_tickets || t.shift_tickets.length === 0
    );
    if (orphanTickets.length === 0) {
      resolved.push('config_ticket_no_shift');
    }

    // Check config_shift_no_tickets
    const { data: shiftsNoTickets } = await supabaseAdmin
      .from('shifts')
      .select('id, shift_tickets(id)')
      .eq('location_id', locationId)
      .eq('is_active', true);

    const orphanShifts = (shiftsNoTickets || []).filter(
      (s: any) => !s.shift_tickets || s.shift_tickets.length === 0
    );
    if (orphanShifts.length === 0) {
      resolved.push('config_shift_no_tickets');
    }

    // Check config_ticket_no_policy
    const { data: ticketsNoPolicy } = await supabaseAdmin
      .from('tickets')
      .select('id')
      .eq('location_id', locationId)
      .eq('status', 'active')
      .is('policy_set_id', null)
      .limit(1);

    if (!ticketsNoPolicy || ticketsNoPolicy.length === 0) {
      resolved.push('config_ticket_no_policy');
    }

    // Check config_ticket_draft
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: staleDrafts } = await supabaseAdmin
      .from('tickets')
      .select('id')
      .eq('location_id', locationId)
      .eq('status', 'draft')
      .lt('created_at', sevenDaysAgo.toISOString())
      .limit(1);

    if (!staleDrafts || staleDrafts.length === 0) {
      resolved.push('config_ticket_draft');
    }

    // Check config_squeeze_no_limit
    const { data: squeezeNoLimit } = await supabaseAdmin
      .from('shift_tickets')
      .select('id, shifts!inner(is_active)')
      .eq('location_id', locationId)
      .eq('squeeze_enabled', true)
      .is('squeeze_limit_per_shift', null)
      .eq('shifts.is_active', true)
      .limit(1);

    if (!squeezeNoLimit || squeezeNoLimit.length === 0) {
      resolved.push('config_squeeze_no_limit');
    }

    return resolved;
  },
};

// ============================================
// ONBOARDING SIGNAL PROVIDER
// ============================================

const onboardingProvider: SignalProvider = {
  name: 'onboarding',

  async evaluate(locationId: string, orgId: string): Promise<SignalDraft[]> {
    const drafts: SignalDraft[] = [];

    // Stalled candidates: active candidates in same phase for > 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: stalledCandidates } = await supabaseAdmin
      .from('onboarding_candidates')
      .select('id, first_name, last_name, current_phase_id, updated_at')
      .eq('location_id', locationId)
      .eq('status', 'active')
      .lt('updated_at', sevenDaysAgo.toISOString());

    if (stalledCandidates && stalledCandidates.length > 0) {
      for (const c of stalledCandidates) {
        drafts.push({
          organization_id: orgId,
          location_id: locationId,
          module: 'onboarding',
          signal_type: 'stalled_candidate',
          kind: 'signal',
          severity: 'warning',
          title: `${c.first_name} ${c.last_name} staat stil`,
          message: 'Kandidaat zit langer dan 7 dagen in dezelfde fase.',
          action_path: `/onboarding/${c.id}`,
          dedup_key: `stalled_candidate:${c.id}`,
          actionable: true,
          priority: 25,
          payload: { candidate_id: c.id },
        });
      }
    }

    // Overdue tasks
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: overdueTasks } = await supabaseAdmin
      .from('ob_tasks')
      .select('id, title, candidate_id, created_at, onboarding_candidates!inner(first_name, last_name, status)')
      .eq('location_id', locationId)
      .eq('status', 'pending')
      .eq('onboarding_candidates.status', 'active')
      .lt('created_at', threeDaysAgo.toISOString());

    if (overdueTasks && overdueTasks.length > 0) {
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'onboarding',
        signal_type: 'overdue_tasks',
        kind: 'signal',
        severity: 'warning',
        title: `${overdueTasks.length} openstaande onboarding taak/taken`,
        message: 'Er zijn taken die al meer dan 3 dagen openstaan.',
        action_path: '/onboarding',
        dedup_key: `overdue_tasks:${locationId}`,
        actionable: true,
        priority: 30,
        payload: { count: overdueTasks.length },
      });
    }

    return drafts;
  },

  async resolveStale(locationId: string): Promise<string[]> {
    const resolved: string[] = [];

    // Check stalled candidates per candidate
    const { data: activeSignals } = await supabaseAdmin
      .from('signals')
      .select('id, dedup_key, payload')
      .eq('location_id', locationId)
      .eq('signal_type', 'stalled_candidate')
      .eq('status', 'active');

    if (activeSignals) {
      for (const signal of activeSignals) {
        const candidateId = (signal.payload as any)?.candidate_id;
        if (!candidateId) continue;

        const { data: candidate } = await supabaseAdmin
          .from('onboarding_candidates')
          .select('status, updated_at')
          .eq('id', candidateId)
          .single();

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        if (!candidate || candidate.status !== 'active' || new Date(candidate.updated_at) > sevenDaysAgo) {
          await supabaseAdmin
            .from('signals')
            .update({ status: 'resolved', resolved_at: new Date().toISOString() })
            .eq('id', signal.id);
        }
      }
    }

    // Check overdue_tasks
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: overdueTasks } = await supabaseAdmin
      .from('ob_tasks')
      .select('id')
      .eq('location_id', locationId)
      .eq('status', 'pending')
      .lt('created_at', threeDaysAgo.toISOString())
      .limit(1);

    if (!overdueTasks || overdueTasks.length === 0) {
      resolved.push('overdue_tasks');
    }

    return resolved;
  },
};

// ============================================
// SIGNAL ENGINE
// ============================================

const providers: SignalProvider[] = [configProvider, onboardingProvider];

async function processLocation(locationId: string, orgId: string) {
  const results = { created: 0, resolved: 0, skipped: 0 };

  // 1. Auto-resolve stale signals
  for (const provider of providers) {
    const staleTypes = await provider.resolveStale(locationId);

    for (const signalType of staleTypes) {
      const { data: updated } = await supabaseAdmin
        .from('signals')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('location_id', locationId)
        .eq('signal_type', signalType)
        .eq('status', 'active')
        .select('id');

      results.resolved += updated?.length || 0;
    }
  }

  // 2. Evaluate new signals
  for (const provider of providers) {
    const drafts = await provider.evaluate(locationId, orgId);

    for (const draft of drafts) {
      const { data: existing } = await supabaseAdmin
        .from('signals')
        .select('id')
        .eq('dedup_key', draft.dedup_key)
        .eq('status', 'active')
        .maybeSingle();

      if (existing) {
        results.skipped++;
        continue;
      }

      if (draft.cooldown_hours) {
        const { data: coolingDown } = await supabaseAdmin
          .from('signals')
          .select('id')
          .eq('location_id', locationId)
          .eq('signal_type', draft.signal_type)
          .gt('cooldown_until', new Date().toISOString())
          .limit(1);

        if (coolingDown && coolingDown.length > 0) {
          results.skipped++;
          continue;
        }
      }

      const cooldownUntil = draft.cooldown_hours
        ? new Date(Date.now() + draft.cooldown_hours * 3600000).toISOString()
        : null;

      const { error } = await supabaseAdmin.from('signals').insert({
        organization_id: draft.organization_id,
        location_id: draft.location_id,
        module: draft.module,
        signal_type: draft.signal_type,
        kind: draft.kind,
        severity: draft.severity,
        title: draft.title,
        message: draft.message || null,
        action_path: draft.action_path || null,
        payload: draft.payload || {},
        dedup_key: draft.dedup_key,
        cooldown_until: cooldownUntil,
        actionable: draft.actionable,
        priority: draft.priority,
      });

      if (!error) {
        results.created++;
      } else {
        if (error.code === '23505') {
          results.skipped++;
        } else {
          console.error('Error inserting signal:', error);
        }
      }
    }
  }

  return results;
}

// ============================================
// HTTP HANDLER
// ============================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let locationIds: string[] = [];

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (body.location_id) {
        locationIds = [body.location_id];
      }
    }

    if (locationIds.length === 0) {
      const { data: locations } = await supabaseAdmin
        .from('locations')
        .select('id, organization_id')
        .eq('is_active', true);

      if (!locations || locations.length === 0) {
        return new Response(
          JSON.stringify({ message: 'No active locations found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const allResults = [];
      for (const loc of locations) {
        const result = await processLocation(loc.id, loc.organization_id);
        allResults.push({ location_id: loc.id, ...result });
      }

      return new Response(
        JSON.stringify({ results: allResults }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: location } = await supabaseAdmin
      .from('locations')
      .select('id, organization_id')
      .eq('id', locationIds[0])
      .single();

    if (!location) {
      return new Response(
        JSON.stringify({ error: 'Location not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await processLocation(location.id, location.organization_id);

    return new Response(
      JSON.stringify({ location_id: location.id, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('evaluate-signals error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
