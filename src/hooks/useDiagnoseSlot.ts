import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DiagnoseRequest, DiagnoseResponse } from '@/types/availability';

export function useDiagnoseSlot() {
  return useMutation<DiagnoseResponse, Error, DiagnoseRequest>({
    mutationFn: async (req) => {
      const { data, error } = await supabase.functions.invoke('diagnose-slot', {
        body: req,
      });

      if (error) throw error;
      return data as DiagnoseResponse;
    },
  });
}
