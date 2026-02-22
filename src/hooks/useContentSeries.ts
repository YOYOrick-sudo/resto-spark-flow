import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { nestoToast } from '@/lib/nestoToast';

export interface ContentSeries {
  id: string;
  location_id: string;
  name: string;
  description: string | null;
  frequency: string;
  preferred_day: string | null;
  content_type: string | null;
  template_prompt: string | null;
  episode_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useContentSeries() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['content-series', locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_content_series' as any)
        .select('*')
        .eq('location_id', locationId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ContentSeries[];
    },
  });
}

export function useCreateSeries() {
  const queryClient = useQueryClient();
  const { currentLocation } = useUserContext();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      frequency?: string;
      preferred_day?: string;
      content_type?: string;
      template_prompt?: string;
    }) => {
      const { error } = await supabase
        .from('marketing_content_series' as any)
        .insert({
          location_id: currentLocation!.id,
          ...params,
        } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-series'] });
      nestoToast.success('Serie aangemaakt');
    },
    onError: () => nestoToast.error('Kon serie niet aanmaken'),
  });
}

export function useUpdateSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      description?: string;
      frequency?: string;
      preferred_day?: string;
      content_type?: string;
      template_prompt?: string;
      is_active?: boolean;
    }) => {
      const { id, ...updates } = params;
      const { error } = await supabase
        .from('marketing_content_series' as any)
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-series'] });
      nestoToast.success('Serie bijgewerkt');
    },
    onError: () => nestoToast.error('Kon serie niet bijwerken'),
  });
}

export function useDeleteSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketing_content_series' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-series'] });
      nestoToast.success('Serie verwijderd');
    },
    onError: () => nestoToast.error('Kon serie niet verwijderen'),
  });
}
