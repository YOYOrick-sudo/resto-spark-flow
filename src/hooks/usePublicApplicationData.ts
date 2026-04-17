import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicApplicationData {
  settings: {
    location_id: string;
    slug: string;
    welcome_title: string;
    welcome_text: string | null;
    available_positions: string[];
    show_hours: boolean;
    show_start_date: boolean;
    success_message: string;
  };
  branding: {
    location_name: string;
    logo_url: string | null;
    brand_color: string | null;
  } | null;
}

export function usePublicApplicationData(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-application-data', slug],
    queryFn: async (): Promise<PublicApplicationData | null> => {
      if (!slug) return null;
      const { data: settings, error: sErr } = await supabase
        .from('public_application_settings')
        .select(
          'location_id, slug, welcome_title, welcome_text, available_positions, show_hours, show_start_date, success_message'
        )
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (sErr) throw sErr;
      if (!settings) return null;

      const { data: branding } = await supabase.rpc('get_public_branding', { _slug: slug });
      const b = Array.isArray(branding) ? branding[0] : branding;

      return {
        settings: {
          ...settings,
          available_positions: (settings.available_positions as string[]) ?? [],
        },
        branding: b ?? null,
      };
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
