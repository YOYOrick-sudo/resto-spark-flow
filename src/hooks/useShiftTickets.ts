import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";

export interface ShiftTicketRow {
  id: string;
  shift_id: string;
  ticket_id: string;
  location_id: string;
  is_active: boolean;
  override_duration_minutes: number | null;
  override_buffer_minutes: number | null;
  override_min_party: number | null;
  override_max_party: number | null;
  pacing_limit: number | null;
  seating_limit_guests: number | null;
  seating_limit_reservations: number | null;
  ignore_pacing: boolean;
  areas: string[] | null;
  show_area_name: boolean;
  squeeze_enabled: boolean;
  squeeze_duration_minutes: number | null;
  squeeze_gap_minutes: number | null;
  squeeze_to_fixed_end_time: string | null;
  squeeze_limit_per_shift: number | null;
  show_end_time: boolean;
  waitlist_enabled: boolean;
  tickets: {
    name: string;
    display_title: string;
    duration_minutes: number;
    buffer_minutes: number;
    min_party_size: number;
    max_party_size: number;
    color: string;
    is_default: boolean;
    short_description: string | null;
    policy_set_id: string | null;
    status: string;
  } | null;
}

export function useShiftTickets(shiftId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.shiftTickets(shiftId!),
    enabled: !!shiftId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_tickets")
        .select(`
          *,
          tickets(name, display_title, duration_minutes, buffer_minutes,
                  min_party_size, max_party_size, color, is_default,
                  short_description, policy_set_id, status)
        `)
        .eq("shift_id", shiftId!)
        .eq("is_active", true);

      if (error) throw error;
      return (data ?? []) as ShiftTicketRow[];
    },
  });
}
