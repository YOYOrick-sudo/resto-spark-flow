import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nestoToast } from '@/lib/nestoToast';

interface RefundParams {
  reservationId: string;
  amount?: number; // optional partial refund in cents
}

export function useMollieRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reservationId, amount }: RefundParams) => {
      const { data, error } = await supabase.functions.invoke('mollie-create-refund', {
        body: { reservation_id: reservationId, ...(amount != null ? { amount } : {}) },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      nestoToast.success('Terugbetaling aangemaakt');
      queryClient.invalidateQueries({ queryKey: ['reservation', variables.reservationId] });
    },
    onError: (err: Error) => {
      nestoToast.error('Terugbetaling mislukt', err.message);
    },
  });
}
