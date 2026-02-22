import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export interface MarketingCampaign {
  id: string;
  location_id: string;
  name: string;
  campaign_type: string;
  status: string;
  subject: string | null;
  content_html: string | null;
  content_text: string | null;
  segment_id: string | null;
  segment_filter: Record<string, unknown> | null;
  scheduled_at: string | null;
  sent_at: string | null;
  sent_count: number;
  trigger_type: string;
  trigger_event: string | null;
  ai_generated: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useMarketingCampaigns() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery<MarketingCampaign[]>({
    queryKey: ['marketing-campaigns', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MarketingCampaign[];
    },
    enabled: !!locationId,
  });
}

interface CreateCampaignInput {
  name: string;
  campaign_type?: string;
  subject?: string;
  content_html?: string;
  content_text?: string;
  segment_id?: string | null;
  segment_filter?: Record<string, unknown> | null;
  scheduled_at?: string | null;
  status?: string;
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();

  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      if (!currentLocation) throw new Error('No location');
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert({
          location_id: currentLocation.id,
          name: input.name,
          campaign_type: input.campaign_type ?? 'email',
          subject: input.subject ?? null,
          content_html: input.content_html ?? null,
          content_text: input.content_text ?? null,
          segment_id: input.segment_id ?? null,
          segment_filter: input.segment_filter as any ?? null,
          scheduled_at: input.scheduled_at ?? null,
          status: input.status ?? 'draft',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing-campaigns'] });
    },
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateCampaignInput>) => {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing-campaigns'] });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing-campaigns'] });
    },
  });
}
