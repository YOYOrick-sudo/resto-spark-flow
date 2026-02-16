import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';

interface CreateCustomerParams {
  location_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone_number?: string | null;
  language?: string;
  notes?: string | null;
  tags?: string[];
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateCustomerParams) => {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          location_id: params.location_id,
          first_name: params.first_name,
          last_name: params.last_name,
          email: params.email ?? null,
          phone_number: params.phone_number ?? null,
          language: params.language ?? 'nl',
          notes: params.notes ?? null,
          tags: params.tags ?? [],
        })
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
    },
  });
}
