import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicApplicationBranding {
  location_name: string;
  logo_url: string | null;
  brand_color: string | null;
}

export interface PublicApplicationSettings {
  location_id: string;
  slug: string;
  welcome_title: string;
  welcome_text: string | null;
  available_positions: string[];
  show_hours: boolean;
  show_start_date: boolean;
  success_message: string;
}

export type PublicApplicationResult =
  | { status: 'ok'; settings: PublicApplicationSettings; branding: PublicApplicationBranding | null }
  | { status: 'inactive'; branding: PublicApplicationBranding | null }
  | { status: 'not_found' };

async function fetchBranding(slug: string): Promise<PublicApplicationBranding | null> {
  const { data } = await supabase.rpc('get_public_branding', { _slug: slug });
  const b = Array.isArray(data) ? data[0] : data;
  return b ?? null;
}

export function usePublicApplicationData(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-application-data', slug],
    queryFn: async (): Promise<PublicApplicationResult> => {
      if (!slug) return { status: 'not_found' };

      const { data: settings, error: sErr } = await supabase
        .from('public_application_settings')
        .select(
          'location_id, slug, welcome_title, welcome_text, available_positions, show_hours, show_start_date, success_message, is_active',
        )
        .eq('slug', slug)
        .maybeSingle();
      if (sErr) throw sErr;
      if (!settings) return { status: 'not_found' };

      const branding = await fetchBranding(slug);

      if (!settings.is_active) {
        return { status: 'inactive', branding };
      }

      const { is_active: _ignored, ...rest } = settings;
      return {
        status: 'ok',
        settings: {
          ...rest,
          available_positions: (rest.available_positions as string[]) ?? [],
        },
        branding,
      };
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
