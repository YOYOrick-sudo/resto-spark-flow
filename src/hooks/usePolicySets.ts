import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";
import type { CreatePolicySetInput } from "@/types/tickets";

export function usePolicySets(locationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.policySets(locationId!),
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policy_sets")
        .select("id, name, payment_type, payment_amount_cents, cancel_policy_type, noshow_policy_type")
        .eq("location_id", locationId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

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
      toast.success("Beleid aangemaakt");
      if (locationId) qc.invalidateQueries({ queryKey: queryKeys.policySets(locationId) });
    },
    onError: (err: any) => {
      toast.error(err.message || "Fout bij aanmaken beleid");
    },
  });
}
