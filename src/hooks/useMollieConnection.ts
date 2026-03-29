import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export interface MollieConnection {
  id: string;
  location_id: string;
  mollie_organization_id: string | null;
  mollie_profile_id: string | null;
  onboarding_status: string;
  created_at: string;
  updated_at: string;
}

export function useMollieConnection() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['mollie-connection', locationId],
    queryFn: async () => {
      if (!locationId) return null;
      const { data, error } = await supabase
        .from('mollie_connections')
        .select('id, location_id, mollie_organization_id, mollie_profile_id, onboarding_status, created_at, updated_at')
        .eq('location_id', locationId)
        .maybeSingle();
      if (error) throw error;
      return data as MollieConnection | null;
    },
    enabled: !!locationId,
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!locationId) throw new Error('No location');
      const { error } = await supabase
        .from('mollie_connections')
        .delete()
        .eq('location_id', locationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mollie-connection', locationId] });
    },
  });

  const getAuthorizeUrl = () => {
    if (!locationId) return null;
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mollie-oauth?action=authorize&location_id=${locationId}`;
  };

  return {
    connection: query.data,
    isLoading: query.isLoading,
    isConnected: !!query.data?.mollie_organization_id,
    onboardingStatus: query.data?.onboarding_status ?? 'not_connected',
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    getAuthorizeUrl,
    refetch: query.refetch,
  };
}
