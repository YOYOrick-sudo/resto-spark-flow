import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import { nestoToast } from "@/lib/nestoToast";
import type { CreatePolicySetInput, UpdatePolicySetInput } from "@/types/tickets";

// ============================================
// Types
// ============================================

export interface PolicySetWithMeta {
  id: string;
  name: string;
  description: string | null;
  payment_type: string;
  payment_amount_cents: number | null;
  cancel_policy_type: string;
  cancel_window_hours: number | null;
  noshow_policy_type: string;
  noshow_mark_after_minutes: number | null;
  noshow_charge_amount_cents: number | null;
  reconfirm_enabled: boolean;
  reconfirm_hours_before: number | null;
  reconfirm_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  ticketCount: number;
}

// ============================================
// List all policy sets (active + archived)
// ============================================

export function usePolicySets(locationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.policySets(locationId!),
    enabled: !!locationId,
    queryFn: async () => {
      // Fetch policy sets with ticket count
      const { data, error } = await supabase
        .from("policy_sets")
        .select("*, tickets(id, status)")
        .eq("location_id", locationId!)
        .order("name");

      if (error) throw error;

      const policySets: PolicySetWithMeta[] = (data ?? []).map((ps: any) => ({
        id: ps.id,
        name: ps.name,
        description: ps.description,
        payment_type: ps.payment_type,
        payment_amount_cents: ps.payment_amount_cents,
        cancel_policy_type: ps.cancel_policy_type,
        cancel_window_hours: ps.cancel_window_hours,
        noshow_policy_type: ps.noshow_policy_type,
        noshow_mark_after_minutes: ps.noshow_mark_after_minutes,
        noshow_charge_amount_cents: ps.noshow_charge_amount_cents,
        reconfirm_enabled: ps.reconfirm_enabled,
        reconfirm_hours_before: ps.reconfirm_hours_before,
        reconfirm_required: ps.reconfirm_required,
        is_active: ps.is_active,
        created_at: ps.created_at,
        updated_at: ps.updated_at,
        ticketCount: (ps.tickets ?? []).filter((t: any) => t.status === "active").length,
      }));

      return {
        activePolicySets: policySets.filter((ps) => ps.is_active),
        archivedPolicySets: policySets.filter((ps) => !ps.is_active),
      };
    },
  });
}

// ============================================
// Single policy set with linked ticket names
// ============================================

export function usePolicySet(policySetId: string | undefined) {
  return useQuery({
    queryKey: ["policy-set", policySetId],
    enabled: !!policySetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policy_sets")
        .select("*, tickets(id, name, display_title, status)")
        .eq("id", policySetId!)
        .single();

      if (error) throw error;

      const linkedTickets = ((data as any).tickets ?? [])
        .filter((t: any) => t.status === "active")
        .map((t: any) => ({ id: t.id, name: t.name, display_title: t.display_title }));

      return {
        ...data,
        tickets: undefined,
        linkedTickets,
      };
    },
  });
}

// ============================================
// Create policy set (existing)
// ============================================

export function useCreatePolicySet(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePolicySetInput) => {
      const { data, error } = await supabase
        .from("policy_sets")
        .insert(input)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      nestoToast.success("Beleid aangemaakt");
      if (locationId) qc.invalidateQueries({ queryKey: queryKeys.policySets(locationId) });
    },
    onError: (err: any) => {
      nestoToast.error(err.message || "Fout bij aanmaken beleid");
    },
  });
}

// ============================================
// Update policy set
// ============================================

export function useUpdatePolicySet(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdatePolicySetInput) => {
      const { id, ...updates } = input;
      const { error } = await supabase
        .from("policy_sets")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      nestoToast.success("Beleid bijgewerkt");
      if (locationId) qc.invalidateQueries({ queryKey: queryKeys.policySets(locationId) });
    },
    onError: (err: any) => {
      nestoToast.error(err.message || "Fout bij bijwerken beleid");
    },
  });
}

// ============================================
// Archive policy set (soft delete)
// ============================================

export function useArchivePolicySet(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (policySetId: string) => {
      // Pre-check: count active linked tickets
      const { count, error: countError } = await supabase
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("policy_set_id", policySetId)
        .eq("status", "active");

      if (countError) throw countError;
      if ((count ?? 0) > 0) {
        throw new Error(`LINKED_TICKETS:${count}`);
      }

      const { error } = await supabase
        .from("policy_sets")
        .update({ is_active: false })
        .eq("id", policySetId);
      if (error) throw error;
    },
    onSuccess: () => {
      nestoToast.success("Beleid gearchiveerd");
      if (locationId) qc.invalidateQueries({ queryKey: queryKeys.policySets(locationId) });
    },
    onError: (err: any) => {
      // Don't toast for linked tickets error — handled by UI
      if (!err.message?.startsWith("LINKED_TICKETS:")) {
        nestoToast.error(err.message || "Fout bij archiveren beleid");
      }
    },
  });
}

// ============================================
// Restore policy set
// ============================================

export function useRestorePolicySet(locationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (policySetId: string) => {
      const { error } = await supabase
        .from("policy_sets")
        .update({ is_active: true })
        .eq("id", policySetId);
      if (error) throw error;
    },
    onSuccess: () => {
      nestoToast.success("Beleid hersteld");
      if (locationId) qc.invalidateQueries({ queryKey: queryKeys.policySets(locationId) });
    },
    onError: (err: any) => {
      nestoToast.error(err.message || "Fout bij herstellen beleid");
    },
  });
}
