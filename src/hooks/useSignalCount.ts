import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSignals } from '@/hooks/useSignals';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';

export function useSignalCount() {
  const { signals } = useSignals();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const signalCount = useMemo(() => {
    return signals.filter(
      (s) => s.actionable && (s.severity === 'error' || s.severity === 'warning')
    ).length;
  }, [signals]);

  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['unread-messages', locationId],
    queryFn: async () => {
      if (!locationId) return 0;
      const { data, error } = await supabase
        .from('conversations')
        .select('unread_count')
        .eq('location_id', locationId)
        .neq('status', 'closed');
      if (error) return 0;
      return (data || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
    },
    enabled: !!locationId,
    refetchInterval: 30000,
  });

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

  return signalCount + unreadMessages + pendingActions;
}
