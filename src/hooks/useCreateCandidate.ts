import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateCandidateInput {
  location_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  notes?: string;
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCandidateInput) => {
      const { data, error } = await supabase
        .from('onboarding_candidates')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-candidates'] });
      toast.success(`${data.first_name} ${data.last_name} toegevoegd`);
    },
    onError: (error) => {
      toast.error('Kandidaat toevoegen mislukt', { description: error.message });
    },
  });
}
