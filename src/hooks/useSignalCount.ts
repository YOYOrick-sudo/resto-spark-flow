import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSignals } from '@/hooks/useSignals';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';

export function useSignalCount() {
  const { signals } = useSignals();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  // Only count error signals (not warnings)
  const criticalSignals = useMemo(() => {
    return signals.filter(
      (s) => s.actionable && s.severity === 'error'
    ).length;
  }, [signals]);

  // Escalated conversations (guest wants a human)
  const { data: escalations = 0 } = useQuery({
    queryKey: ['escalated-conversations', locationId],
    queryFn: async () => {
      if (!locationId) return 0;
      const { count, error } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .eq('handled_by', 'operator')
        .gt('unread_count', 0);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!locationId,
    refetchInterval: 30000,
  });

  // Pending agent actions awaiting approval
  const { data: pendingActions = 0 } = useQuery({
    queryKey: ['pending-actions', locationId],
    queryFn: async () => {
      if (!locationId) return 0;
      const { count, error } = await supabase
        .from('agent_actions')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .eq('status', 'concept');
      if (error) return 0;
      return count || 0;
    },
    enabled: !!locationId,
    refetchInterval: 30000,
  });

  return escalations + pendingActions + criticalSignals;
}
