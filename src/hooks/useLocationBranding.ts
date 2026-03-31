import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { useCommunicationSettings } from '@/hooks/useCommunicationSettings';
import { BRANDING_DEFAULTS } from '@/utils/branding';

export interface LocationBranding {
  logo_url: string | null;
  brand_color_primary: string;
  brand_color_secondary: string;
  brand_color_accent: string | null;
  hero_image_url: string | null;
  tone_of_voice: string;
  guest_greeting: string | null;
  description_short: string | null;
}

const BRANDING_COLUMNS = 'logo_url, brand_color_primary, brand_color_secondary, brand_color_accent, hero_image_url, tone_of_voice, guest_greeting, description_short';

export function useLocationBranding() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const { data: commSettings } = useCommunicationSettings();

  return useQuery({
    queryKey: ['location-branding', locationId],
    queryFn: async (): Promise<LocationBranding> => {
      const { data, error } = await supabase
        .from('locations')
        .select(BRANDING_COLUMNS)
        .eq('id', locationId!)
        .single();

      if (error) throw error;

      // 3-step fallback: locations → communication_settings → defaults
      return {
        logo_url: data.logo_url || commSettings?.logo_url || null,
        brand_color_primary: data.brand_color_primary || commSettings?.brand_color || BRANDING_DEFAULTS.brandColorPrimary,
        brand_color_secondary: data.brand_color_secondary || BRANDING_DEFAULTS.brandColorSecondary,
        brand_color_accent: data.brand_color_accent || null,
        hero_image_url: data.hero_image_url || null,
        tone_of_voice: data.tone_of_voice || 'informeel',
        guest_greeting: data.guest_greeting || null,
        description_short: data.description_short || null,
      };
    },
    enabled: !!locationId,
  });
}

export function useUpdateLocationBranding() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<LocationBranding>) => {
      if (!locationId) throw new Error('No location');
      const { error } = await supabase
        .from('locations')
        .update(updates as any)
        .eq('id', locationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-branding', locationId] });
    },
  });
}
