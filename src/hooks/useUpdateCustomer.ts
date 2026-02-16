import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';

interface UpdateCustomerParams {
  id: string;
  location_id: string;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone_number?: string | null;
  language?: string;
  notes?: string | null;
  tags?: string[];
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, location_id, ...updates }: UpdateCustomerParams) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers(data.location_id),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.customer(data.id),
        exact: false,
      });
    },
  });
}
