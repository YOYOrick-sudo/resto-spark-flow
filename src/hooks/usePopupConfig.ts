import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export type PopupType = 'reservation' | 'newsletter' | 'custom';

export interface PopupConfig {
  id: string;
  location_id: string;
  name: string;
  priority: number;
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
  featured_ticket_id: string | null;
  popup_type: PopupType;
  custom_button_url: string | null;
  schedule_start_at: string | null;
  schedule_end_at: string | null;
  created_at: string;
  updated_at: string;
}

type PopupConfigUpdates = Partial<Omit<PopupConfig, 'id' | 'location_id' | 'created_at' | 'updated_at'>>;

// Fetch ALL popups for the current location
export function usePopupConfigs() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['popup-configs', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_popup_config')
        .select('*')
        .eq('location_id', locationId!)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PopupConfig[];
    },
    enabled: !!locationId,
  });
}

// Fetch a single popup by ID
export function usePopupConfig(id?: string | null) {
  return useQuery({
    queryKey: ['popup-config', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_popup_config')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as PopupConfig;
    },
    enabled: !!id,
  });
}

// Create a new popup
export function useCreatePopup() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name?: string) => {
      if (!locationId) throw new Error('No location selected');
      const { data, error } = await supabase
        .from('marketing_popup_config')
        .insert({ location_id: locationId, name: name || 'Nieuwe popup' } as any)
        .select()
        .single();
      if (error) throw error;
      return data as PopupConfig;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['popup-configs', locationId] });
    },
  });
}

// Update a specific popup by ID
export function useUpdatePopupConfig(id?: string | null) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: PopupConfigUpdates) => {
      if (!id) throw new Error('No popup selected');
      const { error } = await supabase
        .from('marketing_popup_config')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popup-configs', locationId] });
      queryClient.invalidateQueries({ queryKey: ['popup-config', id] });
    },
  });
}

// Delete a popup
export function useDeletePopup() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (popupId: string) => {
      const { error } = await supabase
        .from('marketing_popup_config')
        .delete()
        .eq('id', popupId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['popup-configs', locationId] });
    },
  });
}
