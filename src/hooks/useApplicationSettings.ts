import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nestoToast } from '@/lib/nestoToast';

export interface ApplicationSettings {
  id: string;
  location_id: string;
  slug: string;
  is_active: boolean;
  welcome_title: string;
  welcome_text: string | null;
  available_positions: string[];
  show_hours: boolean;
  show_start_date: boolean;
  success_message: string;
}

export function useApplicationSettings(locationId: string | undefined) {
  return useQuery({
    queryKey: ['application-settings', locationId],
    queryFn: async (): Promise<ApplicationSettings | null> => {
      if (!locationId) return null;
      const { data, error } = await supabase
        .from('public_application_settings')
        .select('id, location_id, slug, is_active, welcome_title, welcome_text, available_positions, show_hours, show_start_date, success_message')
        .eq('location_id', locationId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        available_positions: (data.available_positions as string[]) ?? [],
      };
    },
    enabled: !!locationId,
  });
}

export function useUpdateApplicationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ApplicationSettings> & { id: string }) => {
      const { id, ...rest } = input;
      const { data, error } = await supabase
        .from('public_application_settings')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['application-settings'] });
      if (vars.slug) {
        qc.invalidateQueries({ queryKey: ['public-application-data', vars.slug] });
      }
      nestoToast.success('Wijzigingen opgeslagen');
    },
    onError: (e: Error) => nestoToast.error('Opslaan mislukt', e.message),
  });
}