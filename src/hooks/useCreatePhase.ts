import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';

interface CreatePhaseInput {
  name: string;
  description?: string;
}

export function useCreatePhase() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description }: CreatePhaseInput) => {
      if (!locationId) throw new Error('No location');

      // Get next sort_order
      const { data: existing } = await supabase
        .from('onboarding_phases')
        .select('sort_order')
        .eq('location_id', locationId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.sort_order ?? 0) + 10;

      const { data, error } = await supabase
        .from('onboarding_phases')
        .insert({
          location_id: locationId,
          name,
          description: description || null,
          sort_order: nextOrder,
          is_active: true,
          is_custom: true,
          task_templates: [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-phases-all', locationId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-phases', locationId] });
      toast.success('Fase toegevoegd');
    },
    onError: () => {
      toast.error('Kon fase niet toevoegen');
    },
  });
}
