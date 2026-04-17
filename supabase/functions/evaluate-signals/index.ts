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
// NO-SHOW RISK SIGNAL PROVIDER
// ============================================

const noShowRiskProvider: SignalProvider = {
  name: 'noshow_risk',

  async evaluate(locationId: string, orgId: string): Promise<SignalDraft[]> {
    const drafts: SignalDraft[] = [];

    const hasRes = await hasReservationsEntitlement(locationId);
    if (!hasRes) return drafts;

    const today = new Date().toISOString().slice(0, 10);

    // 1. High risk shift: avg risk >= 40 for any shift today
    const { data: shiftRisks } = await supabaseAdmin
      .from('shift_risk_summary')
      .select('*')
      .eq('location_id', locationId)
      .eq('reservation_date', today);

    for (const sr of (shiftRisks || [])) {
      if (sr.avg_risk_score >= 40) {
        // Get shift name
        const { data: shift } = await supabaseAdmin
          .from('shifts')
          .select('name')
          .eq('id', sr.shift_id)
          .single();

        drafts.push({
          organization_id: orgId,
          location_id: locationId,
          module: 'reserveringen',
          signal_type: 'high_noshow_risk_shift',
          kind: 'signal',
          severity: 'warning',
          title: `Hoog no-show risico: ${shift?.name ?? 'shift'}`,
          message: `${sr.high_risk_count} reservering(en) met hoog risico (gem. score ${sr.avg_risk_score}). ${sr.high_risk_covers} covers.`,
          action_path: '/reserveringen',
          dedup_key: `high_noshow_risk_shift:${locationId}:${sr.shift_id}:${today}`,
          actionable: true,
          priority: 20,
          cooldown_hours: 12,
          payload: {
            shift_id: sr.shift_id,
            shift_name: shift?.name,
            date: today,
            avg_risk: sr.avg_risk_score,
            high_risk_count: sr.high_risk_count,
            high_risk_covers: sr.high_risk_covers,
          },
        });
      }
    }

    // 2. Summary: high risk reservations today (info)
    const { data: highRisk } = await supabaseAdmin
      .from('reservations')
      .select('id')
      .eq('location_id', locationId)
      .eq('reservation_date', today)
      .in('status', ['confirmed', 'option', 'pending_payment'])
      .gte('no_show_risk_score', 50);

    if (highRisk && highRisk.length > 0) {
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'reserveringen',
        signal_type: 'high_risk_reservations_today',
        kind: 'insight',
        severity: 'info',
        title: `${highRisk.length} reservering(en) met hoog no-show risico vandaag`,
        message: 'Overweeg herbevestiging te vragen of overbooking in te plannen.',
        action_path: '/reserveringen',
        dedup_key: `high_risk_reservations_today:${locationId}:${today}`,
        actionable: false,
        priority: 35,
        cooldown_hours: 12,
        payload: { count: highRisk.length, date: today },
      });
    }

    return drafts;
  },

  async resolveStale(locationId: string): Promise<string[]> {
    const resolved: string[] = [];

    const hasRes = await hasReservationsEntitlement(locationId);
    if (!hasRes) {
      return ['high_noshow_risk_shift', 'high_risk_reservations_today'];
    }

    // These signals are date-specific and cooldown-based, so no explicit resolve needed.
    // They naturally expire via cooldown_until. But resolve if date has passed.
    const today = new Date().toISOString().slice(0, 10);

    const { data: staleSignals } = await supabaseAdmin
      .from('signals')
      .select('id, payload')
      .eq('location_id', locationId)
      .in('signal_type', ['high_noshow_risk_shift', 'high_risk_reservations_today'])
      .eq('status', 'active');

    for (const s of (staleSignals || [])) {
      const signalDate = (s.payload as any)?.date;
      if (signalDate && signalDate < today) {
        await supabaseAdmin
          .from('signals')
          .update({ status: 'resolved', resolved_at: new Date().toISOString() })
          .eq('id', s.id);
      }
    }

    return resolved;
  },
};

// ============================================
// MARKETING SIGNAL PROVIDER
// ============================================

async function hasMarketingEntitlement(locationId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('location_entitlements')
    .select('id')
    .eq('location_id', locationId)
    .eq('module_key', 'marketing')
    .eq('enabled', true)
    .maybeSingle();
  return !!data;
}

const marketingProvider: SignalProvider = {
  name: 'marketing',

  async evaluate(locationId: string, orgId: string): Promise<SignalDraft[]> {
    const drafts: SignalDraft[] = [];
    const hasMkt = await hasMarketingEntitlement(locationId);
    if (!hasMkt) return drafts;

    // 1. marketing_negative_review: unresponded reviews with rating <= 3
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: negReviews } = await supabaseAdmin
      .from('marketing_reviews')
      .select('id, author_name, rating')
      .eq('location_id', locationId)
      .lte('rating', 3)
      .is('response_text', null)
      .gt('created_at', sevenDaysAgo.toISOString())
      .limit(5);

    if (negReviews && negReviews.length > 0) {
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'marketing',
        signal_type: 'marketing_negative_review',
        kind: 'signal',
        severity: 'warning',
        title: `${negReviews.length} negatieve review(s) zonder antwoord`,
        message: 'Reviews met 1-3 sterren wachten op een reactie.',
        action_path: '/marketing/reviews',
        dedup_key: `marketing_negative_review:${locationId}`,
        actionable: true,
        priority: 20,
        cooldown_hours: 24,
        payload: { count: negReviews.length },
      });
    }

    // 2. marketing_unscheduled_week: fewer than 3 scheduled posts next 7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data: scheduled } = await supabaseAdmin
      .from('marketing_social_posts')
      .select('id')
      .eq('location_id', locationId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .lte('scheduled_at', nextWeek.toISOString());

    if (!scheduled || scheduled.length < 3) {
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'marketing',
        signal_type: 'marketing_unscheduled_week',
        kind: 'signal',
        severity: 'info',
        title: `Slechts ${scheduled?.length ?? 0} post(s) ingepland deze week`,
        message: 'Plan minimaal 3 posts per week voor consistente zichtbaarheid.',
        action_path: '/marketing/kalender',
        dedup_key: `marketing_unscheduled_week:${locationId}`,
        actionable: true,
        priority: 50,
        cooldown_hours: 72,
        payload: { count: scheduled?.length ?? 0 },
      });
    }

    // 3. marketing_review_score_declining: avg rating last 30d vs 30-60d, diff >= 0.3
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: recentReviews } = await supabaseAdmin
      .from('marketing_reviews')
      .select('rating')
      .eq('location_id', locationId)
      .gte('published_at', thirtyDaysAgo.toISOString());

    const { data: olderReviews } = await supabaseAdmin
      .from('marketing_reviews')
      .select('rating')
      .eq('location_id', locationId)
      .gte('published_at', sixtyDaysAgo.toISOString())
      .lt('published_at', thirtyDaysAgo.toISOString());

    if (recentReviews && recentReviews.length >= 2 && olderReviews && olderReviews.length >= 2) {
      const avgRecent = recentReviews.reduce((s, r) => s + r.rating, 0) / recentReviews.length;
      const avgOlder = olderReviews.reduce((s, r) => s + r.rating, 0) / olderReviews.length;
      if (avgOlder - avgRecent >= 0.3) {
        drafts.push({
          organization_id: orgId,
          location_id: locationId,
          module: 'marketing',
          signal_type: 'marketing_review_score_declining',
          kind: 'signal',
          severity: 'warning',
          title: `Review score gedaald: ${avgRecent.toFixed(1)} vs ${avgOlder.toFixed(1)}`,
          message: 'Je gemiddelde review score is de afgelopen 30 dagen gedaald.',
          action_path: '/marketing/reviews',
          dedup_key: `marketing_review_score_declining:${locationId}`,
          actionable: true,
          priority: 25,
          cooldown_hours: 168,
          payload: { avg_recent: avgRecent, avg_older: avgOlder },
        });
      }
    }

    // 4. marketing_at_risk_guests: customers with 60+ days since last visit and 2+ visits
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().slice(0, 10);
    const { data: atRisk } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('location_id', locationId)
      .gte('total_visits', 2)
      .lt('last_visit_at', sixtyDaysAgoStr)
      .limit(50);

    if (atRisk && atRisk.length > 10) {
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'marketing',
        signal_type: 'marketing_at_risk_guests',
        kind: 'insight',
        severity: 'info',
        title: `${atRisk.length}+ gasten dreigen af te haken`,
        message: 'Vaste gasten die al 60+ dagen niet zijn geweest. Overweeg een win-back campagne.',
        action_path: '/marketing/segmenten',
        dedup_key: `marketing_at_risk_guests:${locationId}`,
        actionable: true,
        priority: 40,
        cooldown_hours: 72,
        payload: { count: atRisk.length },
      });
    }

    // 5. marketing_email_open_rate_declining: avg open rate last 3 campaigns < prev 3
    const { data: campaigns } = await supabaseAdmin
      .from('marketing_campaign_analytics')
      .select('sent_count, opened_count')
      .eq('location_id', locationId)
      .eq('channel', 'email')
      .order('updated_at', { ascending: false })
      .limit(6);

    if (campaigns && campaigns.length >= 6) {
      const calcRate = (items: typeof campaigns) => {
        const totalSent = items.reduce((s, c) => s + c.sent_count, 0);
        const totalOpened = items.reduce((s, c) => s + c.opened_count, 0);
        return totalSent > 0 ? totalOpened / totalSent : 0;
      };
      const recent3 = calcRate(campaigns.slice(0, 3));
      const prev3 = calcRate(campaigns.slice(3, 6));

      if (prev3 > 0 && recent3 < prev3) {
        drafts.push({
          organization_id: orgId,
          location_id: locationId,
          module: 'marketing',
          signal_type: 'marketing_email_open_rate_declining',
          kind: 'signal',
          severity: 'warning',
          title: `Email open rate gedaald: ${(recent3 * 100).toFixed(0)}% vs ${(prev3 * 100).toFixed(0)}%`,
          message: 'De open rate van je recente campagnes is lager dan de vorige.',
          action_path: '/marketing/campagnes',
          dedup_key: `marketing_email_open_rate_declining:${locationId}`,
          actionable: true,
          priority: 35,
          cooldown_hours: 168,
          payload: { recent_rate: recent3, prev_rate: prev3 },
        });
      }
    }

    // 6. marketing_engagement_dropping: engagement < 80% of baseline
    const { data: intel } = await supabaseAdmin
      .from('marketing_brand_intelligence')
      .select('engagement_baseline')
      .eq('location_id', locationId)
      .maybeSingle();

    if (intel?.engagement_baseline) {
      const baseline = intel.engagement_baseline as Record<string, unknown>;
      const avgEngagement = baseline.avg_engagement as number | undefined;

      if (avgEngagement && avgEngagement > 0) {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const { data: recentPosts } = await supabaseAdmin
          .from('marketing_social_posts')
          .select('analytics')
          .eq('location_id', locationId)
          .eq('status', 'published')
          .gte('published_at', twoWeeksAgo.toISOString());

        if (recentPosts && recentPosts.length >= 3) {
          const totalEngagement = recentPosts.reduce((s, p) => {
            const a = p.analytics as Record<string, number> | null;
            return s + (a?.engagement || a?.likes || 0);
          }, 0);
          const avgRecentEng = totalEngagement / recentPosts.length;

          if (avgRecentEng < avgEngagement * 0.8) {
            drafts.push({
              organization_id: orgId,
              location_id: locationId,
              module: 'marketing',
              signal_type: 'marketing_engagement_dropping',
              kind: 'signal',
              severity: 'warning',
              title: 'Social engagement daalt',
              message: `Engagement is 20%+ onder je baseline van de afgelopen 2 weken.`,
              action_path: '/marketing/social',
              dedup_key: `marketing_engagement_dropping:${locationId}`,
              actionable: true,
              priority: 30,
              cooldown_hours: 168,
              payload: { avg_recent: avgRecentEng, baseline: avgEngagement },
            });
          }
        }
      }
    }

    // 7. marketing_popup_suggestion_pending: pending suggestion older than 24h
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: pendingSuggestion } = await supabaseAdmin
      .from('marketing_popup_suggestions')
      .select('id, headline')
      .eq('location_id', locationId)
      .eq('status', 'pending')
      .lt('created_at', oneDayAgo.toISOString())
      .limit(1);

    if (pendingSuggestion && pendingSuggestion.length > 0) {
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'marketing',
        signal_type: 'marketing_popup_suggestion_pending',
        kind: 'signal',
        severity: 'info',
        title: 'Er staat een AI popup-suggestie klaar',
        message: `Suggestie: "${pendingSuggestion[0].headline}"`,
        action_path: '/marketing/popup',
        dedup_key: `marketing_popup_suggestion_pending:${locationId}`,
        actionable: true,
        priority: 45,
        cooldown_hours: 168, // 7 days
        payload: { suggestion_id: pendingSuggestion[0].id },
      });
    }

    return drafts;
  },

  async resolveStale(locationId: string): Promise<string[]> {
    const resolved: string[] = [];
    const hasMkt = await hasMarketingEntitlement(locationId);
    if (!hasMkt) {
      return [
        'marketing_negative_review', 'marketing_unscheduled_week',
        'marketing_engagement_dropping', 'marketing_review_score_declining',
        'marketing_at_risk_guests', 'marketing_email_open_rate_declining',
        'marketing_popup_suggestion_pending',
      ];
    }

    // Resolve negative_review if no unresponded reviews with rating <= 2
    const { data: negReviews } = await supabaseAdmin
      .from('marketing_reviews')
      .select('id')
      .eq('location_id', locationId)
      .lte('rating', 2)
      .is('response_text', null)
      .limit(1);

    if (!negReviews || negReviews.length === 0) {
      resolved.push('marketing_negative_review');
    }

    // Resolve unscheduled_week if >= 3 posts scheduled
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const { data: scheduled } = await supabaseAdmin
      .from('marketing_social_posts')
      .select('id')
      .eq('location_id', locationId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .lte('scheduled_at', nextWeek.toISOString());

    if (scheduled && scheduled.length >= 3) {
      resolved.push('marketing_unscheduled_week');
    }

    // Resolve popup_suggestion_pending if no pending suggestions
    const { data: pendingSugs } = await supabaseAdmin
      .from('marketing_popup_suggestions')
      .select('id')
      .eq('location_id', locationId)
      .eq('status', 'pending')
      .limit(1);

    if (!pendingSugs || pendingSugs.length === 0) {
      resolved.push('marketing_popup_suggestion_pending');
    }

    return resolved;
  },
};

// ============================================
// WAITLIST SIGNAL PROVIDER
// ============================================

const waitlistProvider: SignalProvider = {
  name: 'waitlist',

  async evaluate(locationId: string, orgId: string): Promise<SignalDraft[]> {
    const drafts: SignalDraft[] = [];
    const hasRes = await hasReservationsEntitlement(locationId);
    if (!hasRes) return drafts;

    const today = new Date().toISOString().slice(0, 10);

    // 1. Guests on waitlist today
    const { count: waitingCount } = await supabaseAdmin
      .from('waitlist_entries')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('date', today)
      .eq('status', 'pending');

    if (waitingCount && waitingCount > 0) {
      drafts.push({
        organization_id: orgId, location_id: locationId, module: 'reserveringen',
        signal_type: 'waitlist_pending_today', kind: 'signal', severity: 'info',
        title: `${waitingCount} gast(en) op wachtlijst vandaag`,
        action_path: '/reserveringen', dedup_key: `waitlist_pending_today:${locationId}:${today}`,
        actionable: false, priority: 40, cooldown_hours: 6,
        payload: { count: waitingCount, date: today },
      });
    }

    // 2. Expired invites with pending entries remaining
    const { count: expiredCount } = await supabaseAdmin
      .from('waitlist_invites')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('status', 'expired')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString());

    if (expiredCount && expiredCount > 0 && waitingCount && waitingCount > 0) {
      drafts.push({
        organization_id: orgId, location_id: locationId, module: 'reserveringen',
        signal_type: 'waitlist_invite_expired', kind: 'signal', severity: 'warning',
        title: `Uitnodiging verlopen — nog ${waitingCount} wachtend`,
        action_path: '/reserveringen', dedup_key: `waitlist_invite_expired:${locationId}:${today}`,
        actionable: true, priority: 30, cooldown_hours: 4,
        payload: { expired: expiredCount, waiting: waitingCount },
      });
    }

    // 3. Conversions (accepted in last 24h)
    const { data: conversions } = await supabaseAdmin
      .from('waitlist_invites')
      .select('id, waitlist_entries!inner(first_name, last_name)')
      .eq('location_id', locationId)
      .eq('status', 'accepted')
      .gte('accepted_at', new Date(Date.now() - 86400000).toISOString())
      .limit(5);

    for (const c of (conversions || [])) {
      const entry = (c as any).waitlist_entries;
      const name = `${entry?.first_name || ''} ${entry?.last_name || ''}`.trim();
      drafts.push({
        organization_id: orgId, location_id: locationId, module: 'reserveringen',
        signal_type: 'waitlist_conversion', kind: 'signal', severity: 'ok',
        title: `Wachtlijst-conversie: ${name} heeft geboekt!`,
        action_path: '/reserveringen', dedup_key: `waitlist_conversion:${c.id}`,
        actionable: false, priority: 50,
        payload: { invite_id: c.id, name },
      });
    }

    // 4. High no-show risk + waitlist match
    const { data: highRiskWithWaitlist } = await supabaseAdmin
      .from('reservations')
      .select('id, reservation_date, start_time, party_size, no_show_risk_score')
      .eq('location_id', locationId)
      .eq('reservation_date', today)
      .in('status', ['confirmed', 'option'])
      .gte('no_show_risk_score', 60);

    if (highRiskWithWaitlist && highRiskWithWaitlist.length > 0 && waitingCount && waitingCount > 0) {
      drafts.push({
        organization_id: orgId, location_id: locationId, module: 'reserveringen',
        signal_type: 'waitlist_noshow_match', kind: 'signal', severity: 'warning',
        title: `Hoge no-show kans + wachtlijst match beschikbaar`,
        message: `${highRiskWithWaitlist.length} reservering(en) met hoog risico en ${waitingCount} gast(en) op de wachtlijst.`,
        action_path: '/reserveringen', dedup_key: `waitlist_noshow_match:${locationId}:${today}`,
        actionable: true, priority: 15, cooldown_hours: 12,
        payload: { high_risk_count: highRiskWithWaitlist.length, waiting: waitingCount },
      });
    }

    // 5. Not reconfirmed + waitlist match (12h+ since reconfirm sent)
    const twelveHoursAgo = new Date(Date.now() - 12 * 3600000).toISOString();
    const { data: notReconfirmed } = await supabaseAdmin
      .from('reservations')
      .select('id')
      .eq('location_id', locationId)
      .in('reservation_date', [today])
      .in('status', ['confirmed', 'option'])
      .not('reconfirm_sent_at', 'is', null)
      .is('reconfirmed_at', null)
      .lt('reconfirm_sent_at', twelveHoursAgo);

    if (notReconfirmed && notReconfirmed.length > 0 && waitingCount && waitingCount > 0) {
      drafts.push({
        organization_id: orgId, location_id: locationId, module: 'reserveringen',
        signal_type: 'waitlist_not_reconfirmed', kind: 'signal', severity: 'warning',
        title: `Niet herbevestigd + wachtlijst match beschikbaar`,
        message: `${notReconfirmed.length} gast(en) hebben niet herbevestigd na 12+ uur. ${waitingCount} wachtende(n).`,
        action_path: '/reserveringen', dedup_key: `waitlist_not_reconfirmed:${locationId}:${today}`,
        actionable: true, priority: 10, cooldown_hours: 12,
        payload: { not_reconfirmed: notReconfirmed.length, waiting: waitingCount },
      });
    }

    return drafts;
  },

  async resolveStale(locationId: string): Promise<string[]> {
    const resolved: string[] = [];
    const hasRes = await hasReservationsEntitlement(locationId);
    if (!hasRes) {
      return ['waitlist_pending_today', 'waitlist_invite_expired', 'waitlist_conversion', 'waitlist_noshow_match', 'waitlist_not_reconfirmed'];
    }
    // Date-based signals resolve naturally via cooldown
    return resolved;
  },
};

// ============================================
// SIGNAL ENGINE
// ============================================

// ============================================
// PACING SIGNAL PROVIDER
// ============================================

const pacingProvider: SignalProvider = {
  name: 'pacing',

  async evaluate(locationId: string, orgId: string): Promise<SignalDraft[]> {
    const drafts: SignalDraft[] = [];
    const hasRes = await hasReservationsEntitlement(locationId);
    if (!hasRes) return drafts;

    const today = new Date().toISOString().slice(0, 10);

    // Get shift exceptions with pacing overrides for today
    const { data: overrides } = await supabaseAdmin
      .from('shift_exceptions')
      .select('id, shift_id, override_pacing_limit_covers, override_max_covers_total, override_online_booking_enabled, shifts!inner(name)')
      .eq('location_id', locationId)
      .eq('exception_date', today)
      .not('shift_id', 'is', null);

    for (const exc of (overrides || [])) {
      const shiftName = (exc as any).shifts?.name || 'Shift';

      // 1. Pacing override active
      if (exc.override_pacing_limit_covers != null) {
        drafts.push({
          organization_id: orgId, location_id: locationId, module: 'reserveringen',
          signal_type: 'pacing_override_active', kind: 'signal', severity: 'info',
          title: `Pacing override actief: ${shiftName} heeft ${exc.override_pacing_limit_covers} covers`,
          action_path: '/reserveringen', dedup_key: `pacing_override_active:${exc.shift_id}:${today}`,
          actionable: false, priority: 55, cooldown_hours: 12,
          payload: { shift_id: exc.shift_id, covers: exc.override_pacing_limit_covers },
        });
      }

      // 2. Max covers approaching 80%
      if (exc.override_max_covers_total != null) {
        const { data: resCount } = await supabaseAdmin
          .from('reservations')
          .select('party_size')
          .eq('location_id', locationId)
          .eq('reservation_date', today)
          .eq('shift_id', exc.shift_id!)
          .in('status', ['confirmed', 'seated', 'option']);

        const totalCovers = (resCount || []).reduce((s: number, r: any) => s + r.party_size, 0);
        if (totalCovers >= exc.override_max_covers_total * 0.8) {
          drafts.push({
            organization_id: orgId, location_id: locationId, module: 'reserveringen',
            signal_type: 'pacing_capacity_warning', kind: 'signal', severity: 'warning',
            title: `Pacing bereikt 80%: ${shiftName} heeft ${totalCovers}/${exc.override_max_covers_total} covers`,
            action_path: '/reserveringen', dedup_key: `pacing_capacity_warning:${exc.shift_id}:${today}`,
            actionable: true, priority: 20, cooldown_hours: 6,
            payload: { shift_id: exc.shift_id, current: totalCovers, max: exc.override_max_covers_total },
          });
        }
      }

      // 3. Online booking disabled
      if (exc.override_online_booking_enabled === false) {
        drafts.push({
          organization_id: orgId, location_id: locationId, module: 'reserveringen',
          signal_type: 'pacing_online_disabled', kind: 'signal', severity: 'info',
          title: `Online boeken uitgeschakeld voor ${shiftName} vandaag`,
          action_path: '/reserveringen', dedup_key: `pacing_online_disabled:${exc.shift_id}:${today}`,
          actionable: false, priority: 45, cooldown_hours: 12,
          payload: { shift_id: exc.shift_id },
        });
      }
    }

    return drafts;
  },

  async resolveStale(locationId: string): Promise<string[]> {
    const hasRes = await hasReservationsEntitlement(locationId);
    if (!hasRes) {
      return ['pacing_override_active', 'pacing_capacity_warning', 'pacing_online_disabled'];
    }
    return [];
  },
};

// ============================================
// MOLLIE PROVIDER
// ============================================

const mollieProvider: SignalProvider = {
  name: 'mollie',

  async evaluate(locationId: string, orgId: string): Promise<SignalDraft[]> {
    const signals: SignalDraft[] = [];

    // Check if any policy_sets require payment
    const { data: policySets } = await supabaseAdmin
      .from('policy_sets')
      .select('id, payment_type')
      .eq('location_id', locationId)
      .neq('payment_type', 'none');

    if (policySets && policySets.length > 0) {
      // Check if Mollie is connected
      const { data: mollieConn } = await supabaseAdmin
        .from('mollie_connections')
        .select('id, mollie_organization_id')
        .eq('location_id', locationId)
        .maybeSingle();

      if (!mollieConn?.mollie_organization_id) {
        signals.push({
          organization_id: orgId,
          location_id: locationId,
          module: 'payments',
          signal_type: 'mollie_not_connected',
          kind: 'signal',
          severity: 'warning',
          title: 'Mollie niet verbonden — deposits niet mogelijk',
          message: 'Er zijn tickets die een betaling vereisen, maar Mollie is niet gekoppeld.',
          action_path: '/instellingen/betalingen',
          dedup_key: `mollie_not_connected_${locationId}`,
          actionable: true,
          priority: 80,
          cooldown_hours: 24,
        });
      }
    }

    // Check recent expired payments
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const { data: expiredPayments } = await supabaseAdmin
      .from('reservations')
      .select('id, customer_id, reservation_date, start_time')
      .eq('location_id', locationId)
      .eq('payment_status', 'expired')
      .gte('reservation_date', new Date().toISOString().split('T')[0])
      .gte('updated_at', yesterday)
      .limit(5);

    if (expiredPayments) {
      for (const r of expiredPayments) {
        signals.push({
          organization_id: orgId,
          location_id: locationId,
          module: 'payments',
          signal_type: 'payment_expired',
          kind: 'signal',
          severity: 'info',
          title: `Betaling verlopen voor reservering ${r.reservation_date} ${r.start_time}`,
          action_path: `/reserveringen?id=${r.id}`,
          dedup_key: `payment_expired_${r.id}`,
          actionable: true,
          priority: 40,
          cooldown_hours: 48,
        });
      }
    }

    return signals;
  },

  async resolveStale(locationId: string): Promise<string[]> {
    const staleTypes: string[] = [];

    // Resolve mollie_not_connected if now connected
    const { data: mollieConn } = await supabaseAdmin
      .from('mollie_connections')
      .select('mollie_organization_id')
      .eq('location_id', locationId)
      .maybeSingle();

    if (mollieConn?.mollie_organization_id) {
      staleTypes.push('mollie_not_connected');
    }

    return staleTypes;
  },
};

// ============================================
// MESSAGING SIGNAL PROVIDER
// ============================================

const messagingProvider: SignalProvider = {
  name: 'messaging',

  async evaluate(locationId: string, orgId: string): Promise<SignalDraft[]> {
    const drafts: SignalDraft[] = [];
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1. Delivery failures (5+ in 24u)
    const { count: failedCount } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('channel', 'whatsapp')
      .eq('direction', 'outbound')
      .eq('wa_status', 'failed')
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (failedCount && failedCount >= 5) {
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'messaging',
        signal_type: 'whatsapp_delivery_failures',
        kind: 'signal',
        severity: 'warning',
        title: `${failedCount} WhatsApp berichten niet bezorgd`,
        message: 'Controleer of je WhatsApp-nummer correct is geconfigureerd.',
        action_path: '/instellingen/communicatie',
        dedup_key: `wa_delivery_fail:${locationId}:${now.toISOString().slice(0, 10)}`,
        actionable: true,
        priority: 20,
        cooldown_hours: 4,
      });
    }

    // 2. Onbeantwoorde escalaties (>30 min)
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const { data: escalations } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('location_id', locationId)
      .eq('status', 'escalated')
      .lte('updated_at', thirtyMinutesAgo.toISOString());

    if (escalations && escalations.length > 0) {
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'messaging',
        signal_type: 'whatsapp_escalation_waiting',
        kind: 'signal',
        severity: 'warning',
        title: `${escalations.length} gast${escalations.length > 1 ? 'en' : ''} wacht${escalations.length > 1 ? 'en' : ''} op antwoord`,
        message: 'Er zijn geëscaleerde gesprekken die langer dan 30 minuten wachten.',
        action_path: '/assistent?tab=berichten',
        dedup_key: `wa_escalation:${locationId}:${now.toISOString().slice(0, 13)}`,
        actionable: true,
        priority: 10,
        cooldown_hours: 1,
      });
    }

    // 3. Lage opt-in rate
    const { count: totalCustomers } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId);

    const { count: optInCustomers } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('whatsapp_opt_in', true);

    if (totalCustomers && totalCustomers > 20) {
      const optInRate = (optInCustomers || 0) / totalCustomers;
      if (optInRate < 0.3) {
        drafts.push({
          organization_id: orgId,
          location_id: locationId,
          module: 'messaging',
          signal_type: 'whatsapp_opt_in_low',
          kind: 'insight',
          severity: 'info',
          title: `WhatsApp opt-in: ${Math.round(optInRate * 100)}%`,
          message: 'Minder dan 30% van je gasten ontvangt berichten via WhatsApp. Tip: activeer de opt-in checkbox in je widget.',
          action_path: '/instellingen/communicatie?tab=whatsapp',
          dedup_key: `wa_optin_low:${locationId}`,
          actionable: true,
          priority: 50,
          cooldown_hours: 168, // 1 week
        });
      }
    }

    return drafts;
  },

  async resolveStale(locationId: string): Promise<string[]> {
    const resolved: string[] = [];
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Resolve delivery failures if <5 in last 24h
    const { count: failedCount } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('channel', 'whatsapp')
      .eq('direction', 'outbound')
      .eq('wa_status', 'failed')
      .gte('created_at', twentyFourHoursAgo.toISOString());

    if (!failedCount || failedCount < 5) {
      resolved.push('whatsapp_delivery_failures');
    }

    // Resolve escalation waiting if no pending escalations
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const { data: escalations } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('location_id', locationId)
      .eq('status', 'escalated')
      .lte('updated_at', thirtyMinutesAgo.toISOString())
      .limit(1);

    if (!escalations || escalations.length === 0) {
      resolved.push('whatsapp_escalation_waiting');
    }

    // Resolve opt-in low if now >= 30%
    const { count: totalCustomers } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId);

    const { count: optInCustomers } = await supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('whatsapp_opt_in', true);

    if (totalCustomers && totalCustomers > 0) {
      const optInRate = (optInCustomers || 0) / totalCustomers;
      if (optInRate >= 0.3) {
        resolved.push('whatsapp_opt_in_low');
      }
    }

    return resolved;
  },
};

// ============================================
// INKOOP SIGNAL PROVIDER (D.6b R4b-2)
// ============================================

async function hasInkoopEntitlement(locationId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('location_entitlements')
    .select('id')
    .eq('location_id', locationId)
    .eq('module_key', 'inkoop')
    .eq('enabled', true)
    .maybeSingle();
  return !!data;
}

const inkoopProvider: SignalProvider = {
  name: 'inkoop',

  async evaluate(locationId: string, orgId: string): Promise<SignalDraft[]> {
    const drafts: SignalDraft[] = [];
    const hasEnt = await hasInkoopEntitlement(locationId);
    if (!hasEnt) return drafts;

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 3600 * 1000);

    // 1. inkoop_factuur_goedgekeurd — laatste 24u
    const { data: approved } = await supabaseAdmin
      .from('factuur_uploads')
      .select('id, factuurnummer, leverancier_naam_herkend, leverancier_id, goedgekeurd_op, preview_snapshot, leveranciers(naam)')
      .eq('location_id', locationId)
      .eq('status', 'goedgekeurd')
      .gte('goedgekeurd_op', dayAgo.toISOString());

    for (const f of approved ?? []) {
      const snap = (f as any).preview_snapshot ?? {};
      const nieuwe = Array.isArray(snap.nieuweIngredienten) ? snap.nieuweIngredienten.length : 0;
      const wijz = Array.isArray(snap.kostprijsWijzigingen) ? snap.kostprijsWijzigingen.length : 0;
      const lev = (f as any).leveranciers?.naam ?? (f as any).leverancier_naam_herkend ?? 'onbekende leverancier';
      const parts: string[] = [];
      if (nieuwe > 0) parts.push(`${nieuwe} nieuw ingrediënt${nieuwe > 1 ? 'en' : ''}`);
      if (wijz > 0) parts.push(`${wijz} prijswijziging${wijz > 1 ? 'en' : ''}`);
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'inkoop',
        signal_type: 'inkoop_factuur_goedgekeurd',
        kind: 'signal',
        severity: 'info',
        title: `Factuur goedgekeurd — ${lev}`,
        message: parts.length > 0 ? parts.join(' · ') : 'Factuur verwerkt zonder wijzigingen.',
        action_path: `/inkoop/factuur/${(f as any).id}`,
        dedup_key: `inkoop_factuur_goedgekeurd:${(f as any).id}`,
        actionable: false,
        priority: 70,
        cooldown_hours: 24,
        payload: { factuur_id: (f as any).id, nieuwe, wijzigingen: wijz },
      });
    }

    // 2. inkoop_prijsverandering_groot — uit preview_snapshot, laatste 7d
    const { data: snapshots } = await supabaseAdmin
      .from('factuur_uploads')
      .select('id, factuurnummer, leverancier_naam_herkend, leverancier_id, goedgekeurd_op, preview_snapshot, leveranciers(naam)')
      .eq('location_id', locationId)
      .eq('status', 'goedgekeurd')
      .not('preview_snapshot', 'is', null)
      .gte('goedgekeurd_op', weekAgo.toISOString());

    for (const f of snapshots ?? []) {
      const snap = (f as any).preview_snapshot ?? {};
      const wijzigingen = Array.isArray(snap.kostprijsWijzigingen) ? snap.kostprijsWijzigingen : [];
      const lev = (f as any).leveranciers?.naam ?? (f as any).leverancier_naam_herkend ?? 'onbekend';
      for (const w of wijzigingen) {
        if (w?.severity !== 'groot') continue;
        if (!w.ingredientId) continue;
        const pct = typeof w.deltaPct === 'number' ? w.deltaPct : 0;
        const sign = pct > 0 ? '+' : '';
        drafts.push({
          organization_id: orgId,
          location_id: locationId,
          module: 'inkoop',
          signal_type: 'inkoop_prijsverandering_groot',
          kind: 'signal',
          severity: 'warning',
          title: `${w.ingredientNaam ?? 'Ingrediënt'}: ${sign}${pct.toFixed(1)}% prijswijziging`,
          message: `Grote prijsverandering bij ${lev}. Controleer of dit klopt.`,
          action_path: `/inkoop/factuur/${(f as any).id}`,
          dedup_key: `inkoop_prijsverandering_groot:${(f as any).id}:${w.ingredientId}`,
          actionable: true,
          priority: 30,
          cooldown_hours: 168, // 7 dagen
          payload: {
            factuur_id: (f as any).id,
            ingredient_id: w.ingredientId,
            ingredient_naam: w.ingredientNaam,
            oude_prijs: w.oudePrijs,
            nieuwe_prijs: w.nieuwePrijs,
            delta_pct: pct,
          },
        });
      }
    }

    // 3. inkoop_factuur_parsing_gefaald — failed of vastgelopen >5 min in 'verwerken'
    const { data: failed } = await supabaseAdmin
      .from('factuur_uploads')
      .select('id, bestandsnaam, ai_parsing_status, status, created_at')
      .eq('location_id', locationId)
      .or(
        `and(ai_parsing_status.eq.failed,status.neq.afgewezen),and(status.eq.verwerken,created_at.lt.${fiveMinAgo.toISOString()})`
      );

    for (const f of failed ?? []) {
      if ((f as any).status === 'goedgekeurd' || (f as any).status === 'afgewezen') continue;
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'inkoop',
        signal_type: 'inkoop_factuur_parsing_gefaald',
        kind: 'signal',
        severity: 'error',
        title: `Factuur kon niet verwerkt worden`,
        message: `${(f as any).bestandsnaam} — open de factuur en vul handmatig aan.`,
        action_path: `/inkoop/factuur/${(f as any).id}`,
        dedup_key: `inkoop_factuur_parsing_gefaald:${(f as any).id}`,
        actionable: true,
        priority: 20,
        cooldown_hours: 4,
        payload: { factuur_id: (f as any).id, bestandsnaam: (f as any).bestandsnaam },
      });
    }

    // 4. inkoop_nieuwe_leverancier_ontdekt — herkend maar niet gekoppeld, dedupe op naam
    const { data: nieuweLev } = await supabaseAdmin
      .from('factuur_uploads')
      .select('id, leverancier_naam_herkend, created_at')
      .eq('location_id', locationId)
      .is('leverancier_id', null)
      .not('leverancier_naam_herkend', 'is', null)
      .gte('created_at', seventyTwoHoursAgo.toISOString());

    const seenNamen = new Set<string>();
    for (const f of nieuweLev ?? []) {
      const naam = ((f as any).leverancier_naam_herkend ?? '').trim();
      if (!naam) continue;
      const key = naam.toLowerCase();
      if (seenNamen.has(key)) continue;
      seenNamen.add(key);
      drafts.push({
        organization_id: orgId,
        location_id: locationId,
        module: 'inkoop',
        signal_type: 'inkoop_nieuwe_leverancier_ontdekt',
        kind: 'signal',
        severity: 'info',
        title: `Nieuwe leverancier herkend: ${naam}`,
        message: `Maak een leveranciers-record aan om automatisch te koppelen bij volgende facturen.`,
        action_path: `/inkoop/factuur/${(f as any).id}`,
        dedup_key: `inkoop_nieuwe_leverancier_ontdekt:${locationId}:${key}`,
        actionable: true,
        priority: 50,
        cooldown_hours: 72,
        payload: { factuur_id: (f as any).id, leverancier_naam: naam },
      });
    }

    return drafts;
  },

  async resolveStale(locationId: string): Promise<string[]> {
    const resolved: string[] = [];
    const hasEnt = await hasInkoopEntitlement(locationId);
    if (!hasEnt) {
      return [
        'inkoop_factuur_goedgekeurd',
        'inkoop_prijsverandering_groot',
        'inkoop_factuur_parsing_gefaald',
        'inkoop_nieuwe_leverancier_ontdekt',
      ];
    }
    return resolved;
  },
};

const providers: SignalProvider[] = [configProvider, onboardingProvider, noShowRiskProvider, marketingProvider, waitlistProvider, pacingProvider, mollieProvider, messagingProvider, inkoopProvider];

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
