// Sprint A.3: Hooks voor bitemporal yield-management
// Wraps RPCs: get_current_yield, get_yield_history, apply_yield_correction
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { nestoToast } from "@/lib/nestoToast";

export interface CurrentYield {
  yield_pct: number;
  source: string;
  effective_period: string;
  assertion_period: string;
  yield_id: string;
}

export interface YieldHistoryRow {
  id: string;
  yield_pct: number;
  source: string;
  effective_period: string;
  assertion_period: string;
  correction_reason: string | null;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
}

export interface ApplyYieldCorrectionInput {
  methodeId: string;
  newYieldPct: number; // 0..2 (decimal, niet %)
  effectiveFrom?: string | null; // ISO; null/undefined => default NOW server-side
  correctionReason?: string | null;
}

export function useCurrentYield(methodeId: string | undefined) {
  return useQuery({
    queryKey: ["yield", "current", methodeId],
    queryFn: async (): Promise<CurrentYield | null> => {
      if (!methodeId) return null;
      const { data, error } = await supabase.rpc("get_current_yield", {
        p_methode_id: methodeId,
      });
      if (error) throw error;
      const rows = (data ?? []) as CurrentYield[];
      return rows.length > 0 ? rows[0] : null;
    },
    enabled: !!methodeId,
    staleTime: 30_000,
  });
}

export function useYieldHistory(methodeId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["yield", "history", methodeId],
    queryFn: async (): Promise<YieldHistoryRow[]> => {
      if (!methodeId) return [];
      const { data, error } = await supabase.rpc("get_yield_history", {
        p_methode_id: methodeId,
      });
      if (error) throw error;
      return (data ?? []) as YieldHistoryRow[];
    },
    enabled: !!methodeId && enabled,
  });
}

export function useApplyYieldCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ApplyYieldCorrectionInput): Promise<string> => {
      const payload: Record<string, unknown> = {
        p_methode_id: input.methodeId,
        p_new_yield_pct: input.newYieldPct,
        p_correction_reason: input.correctionReason ?? null,
      };
      if (input.effectiveFrom) {
        payload.p_effective_from = input.effectiveFrom;
      }

      const { data, error } = await supabase.rpc(
        "apply_yield_correction",
        payload as never
      );
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_id, vars) => {
      queryClient.invalidateQueries({ queryKey: ["yield", "current", vars.methodeId] });
      queryClient.invalidateQueries({ queryKey: ["yield", "history", vars.methodeId] });
      nestoToast.success("Yield bijgewerkt", "De wijziging is opgeslagen in de audit-trail.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      nestoToast.error("Yield bijwerken mislukt", msg);
    },
  });
}
