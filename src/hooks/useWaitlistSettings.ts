import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { nestoToast } from '@/lib/nestoToast';

export interface WaitlistSettings {
  location_id: string;
  waitlist_enabled: boolean;
  auto_invite_enabled: boolean;
  auto_invite_delay_minutes: number;
  invite_window_minutes: number;
  max_parallel_invites: number;
  priority_mode: string;
}

export function useWaitlistSettings() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['waitlist-settings', locationId],
    queryFn: async () => {
      if (!locationId) return null;
      const { data, error } = await supabase
        .from('waitlist_settings')
        .select('*')
        .eq('location_id', locationId)
        .maybeSingle();
      if (error) throw error;
      return (data as WaitlistSettings | null) ?? {
        location_id: locationId,
        waitlist_enabled: false,
        auto_invite_enabled: false,
        auto_invite_delay_minutes: 5,
        invite_window_minutes: 30,
        max_parallel_invites: 1,
        priority_mode: 'auto',
      };
    },
    enabled: !!locationId,
  });
}

export function useUpdateWaitlistSettings() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<WaitlistSettings>) => {
      if (!locationId) throw new Error('No location');

      const { error } = await supabase
        .from('waitlist_settings')
        .upsert({
          location_id: locationId,
          ...updates,
        }, { onConflict: 'location_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist-settings', locationId] });
      nestoToast.success('Wachtlijst-instellingen opgeslagen');
    },
    onError: (err: Error) => {
      nestoToast.error(`Fout: ${err.message}`);
    },
  });
}
