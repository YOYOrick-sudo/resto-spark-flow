import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import type { Json } from '@/integrations/supabase/types';

export interface MarketingFlow {
  id: string;
  location_id: string;
  name: string;
  flow_type: string;
  is_active: boolean;
  trigger_config: Record<string, any>;
  template_id: string | null;
  steps: Json;
  stats: Json;
  created_at: string;
  updated_at: string;
}

export function useMarketingFlows() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['marketing-flows', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_automation_flows')
        .select('*')
        .eq('location_id', locationId!)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as MarketingFlow[];
    },
    enabled: !!locationId,
  });
}

export function useUpdateMarketingFlow() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ flowId, updates }: { flowId: string; updates: Partial<Pick<MarketingFlow, 'is_active' | 'trigger_config' | 'template_id'>> }) => {
      const { error } = await supabase
        .from('marketing_automation_flows')
        .update(updates as any)
        .eq('id', flowId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-flows', locationId] });
    },
  });
}
