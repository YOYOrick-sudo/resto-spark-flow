import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { Json } from '@/integrations/supabase/types';

export function useOnboardingSettings() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['onboarding-settings', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_settings')
        .select('*')
        .eq('location_id', locationId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!locationId,
  });
}

/**
 * Generic mutation for updating onboarding_settings columns.
 * Accepts a partial update object with any combination of:
 * - email_templates
 * - reminder_config
 * - email_config
 */
export function useUpdateOnboardingSettings() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: {
      email_templates?: Json;
      reminder_config?: Json;
      email_config?: Json;
      assistant_enabled?: boolean;
    }) => {
      if (!locationId) throw new Error('No location selected');

      const { error } = await supabase
        .from('onboarding_settings')
        .update(updates)
        .eq('location_id', locationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-settings', locationId] });
    },
  });
}
