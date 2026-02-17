import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReservationSettings } from "@/types/reservations";
import { nestoToast } from "@/lib/nestoToast";

export function useReservationSettings(locationId: string | undefined) {
  return useQuery({
    queryKey: ['reservation-settings', locationId],
    queryFn: async (): Promise<ReservationSettings | null> => {
      if (!locationId) return null;

      const { data, error } = await supabase
        .from('reservation_settings')
        .select('*')
        .eq('location_id', locationId)
        .maybeSingle();

      if (error) throw error;
      return data as ReservationSettings | null;
    },
    enabled: !!locationId
  });
}

export function useUpsertReservationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ReservationSettings> & { location_id: string }) => {
      const { data: settings, error } = await supabase
        .from('reservation_settings')
        .upsert(data, { onConflict: 'location_id' })
        .select()
        .single();

      if (error) throw error;
      return settings as ReservationSettings;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reservation-settings', data.location_id] });
      // Geen toast - component toont inline "Opgeslagen" indicator
    },
    onError: (error: Error) => {
      nestoToast.error(`Fout bij opslaan: ${error.message}`);
    }
  });
}

// Default settings for new locations
export const defaultReservationSettings: Omit<ReservationSettings, 'id' | 'location_id' | 'created_at' | 'updated_at'> = {
  allow_multi_table: true,
  auto_assign: false,
  default_duration_minutes: 120,
  booking_cutoff_minutes: 120,
  default_buffer_minutes: 0,
  squeeze_enabled: true,
  default_squeeze_duration_minutes: 90,
  waitlist_auto_invite_enabled: true,
  max_parallel_invites: 1,
  checkin_window_minutes: 15,
  no_show_after_minutes: 15,
  auto_no_show_enabled: false,
  move_to_now_on_checkin: false,
  options_enabled: false,
  option_default_expiry_hours: 24,
  option_auto_release: true,
};
