import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export interface CommunicationSettings {
  id: string;
  location_id: string;
  sender_name: string | null;
  reply_to: string | null;
  footer_text: string | null;
  brand_color: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useCommunicationSettings() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['communication-settings', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communication_settings')
        .select('*')
        .eq('location_id', locationId!)
        .maybeSingle();
      if (error) throw error;
      return data as CommunicationSettings | null;
    },
    enabled: !!locationId,
  });
}

export function useUpdateCommunicationSettings() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Pick<CommunicationSettings, 'sender_name' | 'reply_to' | 'footer_text' | 'brand_color' | 'logo_url'>>) => {
      if (!locationId) throw new Error('No location selected');

      // Upsert: insert if not exists, update if exists
      const { error } = await supabase
        .from('communication_settings')
        .upsert(
          { location_id: locationId, ...updates },
          { onConflict: 'location_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communication-settings', locationId] });
    },
  });
}
