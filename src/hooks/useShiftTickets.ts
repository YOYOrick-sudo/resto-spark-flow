import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import type { ShiftTicketOverrides } from "@/components/settings/shifts/ShiftWizard/ShiftWizardContext";

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

// ============================================
// Sync mutation: upsert + delete shift_tickets
// ============================================

interface SyncShiftTicketsInput {
  shiftId: string;
  locationId: string;
  selectedTickets: string[];
  ticketOverrides: Record<string, ShiftTicketOverrides>;
}

export function useSyncShiftTickets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shiftId, locationId, selectedTickets, ticketOverrides }: SyncShiftTicketsInput) => {
      // 1. Fetch current shift_tickets
      const { data: existing } = await supabase
        .from("shift_tickets")
        .select("id, ticket_id")
        .eq("shift_id", shiftId);

      const existingIds = (existing ?? []).map((st) => st.ticket_id);
      const toRemove = existingIds.filter((id) => !selectedTickets.includes(id));

      // 2. Delete removed
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("shift_tickets")
          .delete()
          .eq("shift_id", shiftId)
          .in("ticket_id", toRemove);
        if (error) throw error;
      }

      // 3. Upsert selected (add + update)
      if (selectedTickets.length > 0) {
        const payload = selectedTickets.map((ticketId) => {
          const o = ticketOverrides[ticketId];
          return {
            shift_id: shiftId,
            ticket_id: ticketId,
            location_id: locationId,
            override_duration_minutes: o?.overrideDuration ?? null,
            override_buffer_minutes: o?.overrideBuffer ?? null,
            override_min_party: o?.overrideMinParty ?? null,
            override_max_party: o?.overrideMaxParty ?? null,
            pacing_limit: o?.pacingLimit ?? null,
            seating_limit_guests: o?.seatingLimitGuests ?? null,
            seating_limit_reservations: o?.seatingLimitReservations ?? null,
            ignore_pacing: o?.ignorePacing ?? false,
            areas: o?.areas ?? null,
            show_area_name: o?.showAreaName ?? false,
            squeeze_enabled: o?.squeezeEnabled ?? false,
            squeeze_duration_minutes: o?.squeezeDuration ?? null,
            squeeze_gap_minutes: o?.squeezeGap ?? null,
            squeeze_to_fixed_end_time: o?.squeezeFixedEndTime ?? null,
            squeeze_limit_per_shift: o?.squeezeLimit ?? null,
            show_end_time: o?.showEndTime ?? false,
            waitlist_enabled: o?.waitlistEnabled ?? false,
            is_active: true,
          };
        });

        const { error } = await supabase
          .from("shift_tickets")
          .upsert(payload, { onConflict: "shift_id,ticket_id" });
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftTickets(vars.shiftId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets(vars.locationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts(vars.locationId) });
    },
  });
}
