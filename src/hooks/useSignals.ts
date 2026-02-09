import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { queryKeys } from '@/lib/queryKeys';
import type { Signal, SignalModule } from '@/types/signals';
import { SIGNAL_MODULE_TO_ENTITLEMENT } from '@/types/signals';

export function useSignals() {
  const { currentLocation, context } = useUserContext();
  const queryClient = useQueryClient();
  const locationId = currentLocation?.id;

  const { data: rawSignals, isLoading, error } = useQuery({
    queryKey: locationId ? queryKeys.signals(locationId) : ['signals', 'none'],
    queryFn: async () => {
      if (!locationId) return [];

      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('location_id', locationId)
        .eq('status', 'active')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Signal[];
    },
    enabled: !!locationId,
  });

  // Fetch muted preferences
  const { data: preferences } = useQuery({
    queryKey: locationId && context
      ? queryKeys.signalPreferences(context.user_id, locationId)
      : ['signal-preferences', 'none'],
    queryFn: async () => {
      if (!locationId || !context) return [];

      const { data, error } = await supabase
        .from('signal_preferences')
        .select('signal_type, muted')
        .eq('user_id', context.user_id)
        .eq('location_id', locationId)
        .eq('muted', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!locationId && !!context,
  });

  // Client-side filtering: entitlements + muted preferences
  const signals = useMemo(() => {
    if (!rawSignals || !context) return [];

    const mutedTypes = new Set(
      (preferences || []).map((p) => p.signal_type)
    );

    return rawSignals.filter((signal) => {
      // Filter muted signal types
      if (mutedTypes.has(signal.signal_type)) return false;

      // Filter by module entitlement (client-side double check)
      const entitlementKey = SIGNAL_MODULE_TO_ENTITLEMENT[signal.module];
      if (entitlementKey) {
        if (context.is_platform_admin) return true;
        const entitlement = context.entitlements.find(
          (e) => e.module === entitlementKey
        );
        if (!entitlement?.enabled) return false;
      }

      return true;
    });
  }, [rawSignals, context, preferences]);

  // Realtime subscription
  useEffect(() => {
    if (!locationId) return;

    const channel = supabase
      .channel(`signals:${locationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signals',
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.signals(locationId),
            exact: false,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [locationId, queryClient]);

  // Available modules (for dynamic filter pills)
  const availableModules = useMemo(() => {
    if (!signals) return new Set<SignalModule>();
    return new Set(signals.map((s) => s.module as SignalModule));
  }, [signals]);

  return {
    signals: signals || [],
    isLoading,
    error,
    availableModules,
  };
}
