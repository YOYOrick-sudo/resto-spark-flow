import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export interface PopupConfig {
  id: string;
  location_id: string;
  is_active: boolean;
  exit_intent_enabled: boolean;
  timed_popup_enabled: boolean;
  timed_popup_delay_seconds: number;
  sticky_bar_enabled: boolean;
  sticky_bar_position: string;
  headline: string;
  description: string;
  button_text: string;
  success_message: string;
  gdpr_text: string;
  created_at: string;
  updated_at: string;
}

export function usePopupConfig() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['popup-config', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_popup_config')
        .select('*')
        .eq('location_id', locationId!)
        .maybeSingle();
      if (error) throw error;
      return data as PopupConfig | null;
    },
    enabled: !!locationId,
  });
}

type PopupConfigUpdates = Partial<Omit<PopupConfig, 'id' | 'location_id' | 'created_at' | 'updated_at'>>;

export function useUpdatePopupConfig() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: PopupConfigUpdates) => {
      if (!locationId) throw new Error('No location selected');
      const { error } = await supabase
        .from('marketing_popup_config')
        .upsert(
          { location_id: locationId, ...updates } as any,
          { onConflict: 'location_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popup-config', locationId] });
    },
  });
}
