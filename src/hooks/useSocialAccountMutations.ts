import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { nestoToast } from '@/lib/nestoToast';
import type { SocialPlatform } from './useMarketingSocialAccounts';

export function useSocialAccountMutations() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  const disconnectAccount = useMutation({
    mutationFn: async (platform: SocialPlatform) => {
      if (!locationId) throw new Error('Geen locatie geselecteerd');
      const { error } = await supabase
        .from('marketing_social_accounts')
        .delete()
        .eq('location_id', locationId)
        .eq('platform', platform);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-social-accounts', locationId] });
      nestoToast.success('Account ontkoppeld');
    },
    onError: () => {
      nestoToast.error('Ontkoppelen mislukt', 'Probeer het opnieuw.');
    },
  });

  return { disconnectAccount };
}
