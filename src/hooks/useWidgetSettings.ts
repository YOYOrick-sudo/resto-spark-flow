import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export interface WidgetSettings {
  id: string;
  location_id: string;
  widget_enabled: boolean;
  location_slug: string | null;
  widget_primary_color: string;
  widget_accent_color: string;
  widget_style: 'auto' | 'showcase' | 'quick';
  widget_logo_url: string | null;
  widget_welcome_text: string | null;
  widget_success_redirect_url: string | null;
  unavailable_text: string;
  show_end_time: boolean;
  show_nesto_branding: boolean;
  booking_questions: BookingQuestion[];
  widget_button_style: string;
  widget_button_logo_url: string | null;
  widget_button_pulse: boolean;
  google_reserve_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingQuestion {
  id: string;
  label: string;
  type: 'text' | 'single_select' | 'multi_select';
  target: 'customer_tags' | 'reservation_tags';
  options?: string[];
  required?: boolean;
}

export function useWidgetSettings() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['widget-settings', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('widget_settings')
        .select('*')
        .eq('location_id', locationId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        booking_questions: (data.booking_questions as unknown as BookingQuestion[]) ?? [],
      } as WidgetSettings;
    },
    enabled: !!locationId,
  });
}

export function useUpdateWidgetSettings() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<WidgetSettings, 'id' | 'location_id' | 'created_at' | 'updated_at'>>) => {
      if (!locationId) throw new Error('No location selected');
      const { error } = await supabase
        .from('widget_settings')
        .upsert(
          { location_id: locationId, ...updates } as any,
          { onConflict: 'location_id' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widget-settings', locationId] });
    },
  });
}
