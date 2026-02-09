import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('ob_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: userId,
        })
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
      toast.error('Taak afvinken mislukt', { description: error.message });
    },
  });
}
