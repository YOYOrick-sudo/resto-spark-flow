import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nestoToast } from '@/lib/nestoToast';

export function useToggleTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userId, currentStatus }: { taskId: string; userId: string; currentStatus: string }) => {
      const isCompleted = currentStatus === 'completed';

      const { data, error } = await supabase
        .from('ob_tasks')
        .update(
          isCompleted
            ? { status: 'pending', completed_at: null, completed_by: null }
            : { status: 'completed', completed_at: new Date().toISOString(), completed_by: userId }
        )
        .eq('id', taskId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-events'] });
    },
    onError: (error) => {
      nestoToast.error('Taakstatus wijzigen mislukt', error.message);
    },
  });
}
