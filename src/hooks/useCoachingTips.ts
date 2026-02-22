import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';

export interface CoachingTip {
  id: string;
  tip_type: string;
  title: string;
  description: string;
  priority: number;
  status: string;
  created_at: string;
}

export function useCoachingTips() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['marketing-coaching-tips', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from('marketing_coaching_tips')
        .select('id, tip_type, title, description, priority, status, created_at')
        .eq('location_id', locationId)
        .eq('status', 'active')
        .order('priority', { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data ?? []) as CoachingTip[];
    },
    enabled: !!locationId,
  });
}

export function useDismissCoachingTip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tipId: string) => {
      const { error } = await supabase
        .from('marketing_coaching_tips')
        .update({ status: 'dismissed' })
        .eq('id', tipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-coaching-tips'] });
      toast.success('Tip verwijderd');
    },
    onError: () => {
      toast.error('Tip kon niet worden verwijderd');
    },
  });
}
