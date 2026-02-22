import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export type SocialPlatform = 'instagram' | 'facebook' | 'google_business';

export interface SocialAccount {
  id: string;
  location_id: string;
  platform: SocialPlatform;
  account_name: string;
  account_id: string | null;
  token_expires_at: string | null;
  page_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AccountStatus = 'active' | 'expiring' | 'disconnected';

export interface SocialAccountWithStatus {
  platform: SocialPlatform;
  account: SocialAccount | null;
  status: AccountStatus;
  expiresAt: Date | null;
}

const PLATFORMS: SocialPlatform[] = ['instagram', 'facebook', 'google_business'];

function getAccountStatus(account: SocialAccount | null): { status: AccountStatus; expiresAt: Date | null } {
  if (!account || !account.is_active) return { status: 'disconnected', expiresAt: null };

  if (account.token_expires_at) {
    const expires = new Date(account.token_expires_at);
    const now = new Date();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (expires.getTime() - now.getTime() < sevenDays) {
      return { status: 'expiring', expiresAt: expires };
    }
  }

  return { status: 'active', expiresAt: account.token_expires_at ? new Date(account.token_expires_at) : null };
}

export function useMarketingSocialAccounts() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const query = useQuery({
    queryKey: ['marketing-social-accounts', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from('marketing_social_accounts')
        .select('*')
        .eq('location_id', locationId);
      if (error) throw error;
      return data as SocialAccount[];
    },
    enabled: !!locationId,
  });

  const accountsWithStatus: SocialAccountWithStatus[] = PLATFORMS.map((platform) => {
    const account = query.data?.find((a) => a.platform === platform) ?? null;
    const { status, expiresAt } = getAccountStatus(account);
    return { platform, account, status, expiresAt };
  });

  return {
    ...query,
    accountsWithStatus,
  };
}
