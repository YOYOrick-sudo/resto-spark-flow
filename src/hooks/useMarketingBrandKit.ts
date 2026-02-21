import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export interface MarketingBrandKit {
  id: string;
  location_id: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  font_heading: string | null;
  font_body: string | null;
  tone_of_voice: string | null;
  tone_description: string | null;
  default_greeting: string | null;
  default_signature: string | null;
  social_handles: Record<string, string> | null;
  gdpr_consent_text: string | null;
  double_opt_in_enabled: boolean;
  marketing_sender_name: string | null;
  marketing_reply_to: string | null;
  max_email_frequency_days: number;
  default_send_time: string;
  created_at: string;
  updated_at: string;
}

export function useMarketingBrandKit() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['marketing-brand-kit', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_brand_kit')
        .select('*')
        .eq('location_id', locationId!)
        .maybeSingle();
      if (error) throw error;
      return data as MarketingBrandKit | null;
    },
    enabled: !!locationId,
  });
}

type BrandKitUpdates = Partial<Omit<MarketingBrandKit, 'id' | 'location_id' | 'created_at' | 'updated_at'>>;

export function useUpdateMarketingBrandKit() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: BrandKitUpdates) => {
      if (!locationId) throw new Error('No location selected');
      const { error } = await supabase
        .from('marketing_brand_kit')
        .upsert(
          { location_id: locationId, ...updates } as any,
          { onConflict: 'location_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-brand-kit', locationId] });
    },
  });
}
