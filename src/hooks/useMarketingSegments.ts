import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { queryKeys } from '@/lib/queryKeys';

export interface FilterCondition {
  field: string;
  operator: string;
  value: string | number;
}

export interface FilterRules {
  conditions: FilterCondition[];
  logic: 'AND' | 'OR';
}

export interface MarketingSegment {
  id: string;
  location_id: string;
  name: string;
  description: string | null;
  filter_rules: FilterRules;
  is_dynamic: boolean;
  is_system: boolean;
  guest_count: number | null;
  guest_count_updated_at: string | null;
  last_campaign_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useMarketingSegments() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery<MarketingSegment[]>({
    queryKey: ['marketing-segments', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from('marketing_segments')
        .select('*')
        .eq('location_id', locationId)
        .order('is_system', { ascending: false })
        .order('name');
      if (error) throw error;
      return (data ?? []) as unknown as MarketingSegment[];
    },
    enabled: !!locationId,
  });
}

export function useCreateSegment() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string; filter_rules: FilterRules }) => {
      if (!currentLocation) throw new Error('No location');
      const { data, error } = await supabase
        .from('marketing_segments')
        .insert({
          location_id: currentLocation.id,
          name: input.name,
          description: input.description ?? null,
          filter_rules: input.filter_rules as any,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing-segments'] });
    },
  });
}

export function useUpdateSegment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; name: string; description?: string; filter_rules: FilterRules }) => {
      const { data, error } = await supabase
        .from('marketing_segments')
        .update({
          name: input.name,
          description: input.description ?? null,
          filter_rules: input.filter_rules as any,
        })
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing-segments'] });
    },
  });
}

export function useDeleteSegment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketing_segments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing-segments'] });
    },
  });
}
