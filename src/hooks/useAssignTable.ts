import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { nestoToast } from "@/lib/nestoToast";
import type { AssignTableParams, AssignTableResult } from "@/types/reservation";

export function useAssignTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AssignTableParams): Promise<AssignTableResult> => {
      const { data, error } = await supabase.rpc("assign_best_table", {
        _location_id: params.location_id,
        _date: params.date,
        _time: params.time,
        _party_size: params.party_size,
        _duration_minutes: params.duration_minutes,
        _shift_id: params.shift_id,
        _ticket_id: params.ticket_id,
        _reservation_id: params.reservation_id ?? null,
        _preferred_area_id: params.preferred_area_id ?? null,
      });
      if (error) throw error;
      return data as unknown as AssignTableResult;
    },
    onSuccess: (data, variables) => {
      // Only invalidate cache on commit mode (reservation_id present)
      if (variables.reservation_id) {
        queryClient.invalidateQueries({ queryKey: ["reservations", variables.location_id] });
        queryClient.invalidateQueries({ queryKey: ["reservation"] });
        queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      }
    },
    onError: () => {
      nestoToast.error("Fout bij tafeltoewijzing");
    },
  });
}
