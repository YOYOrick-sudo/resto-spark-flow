import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { nestoToast } from "@/lib/nestoToast";

interface MoveTableParams {
  reservationId: string;
  newTableId: string | null;
}

export function useMoveTable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reservationId, newTableId }: MoveTableParams) => {
      const { error } = await supabase.rpc("move_reservation_table", {
        _reservation_id: reservationId,
        _new_table_id: newTableId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reservation"] });
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
      nestoToast.success(variables.newTableId ? "Tafel gewijzigd" : "Tafeltoewijzing verwijderd");
    },
    onError: (error: Error) => {
      nestoToast.error(`Fout: ${error.message}`);
    },
  });
}
