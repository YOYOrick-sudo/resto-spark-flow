import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useOnboardingMessages(candidateId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['onboarding-messages', candidateId],
    enabled: !!candidateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_messages')
        .select('*')
        .eq('candidate_id', candidateId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!candidateId) return;

    const channel = supabase
      .channel(`messages-${candidateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'onboarding_messages',
          filter: `candidate_id=eq.${candidateId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['onboarding-messages', candidateId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [candidateId, queryClient]);

  return query;
}
