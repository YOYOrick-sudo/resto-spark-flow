import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useState, useEffect } from 'react';
import type { FilterRules } from './useMarketingSegments';

export function useSegmentPreview(filterRules: FilterRules | null) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  // Debounce filter_rules to avoid spamming RPCs
  const [debouncedRules, setDebouncedRules] = useState(filterRules);
  const debouncedSet = useDebouncedCallback((rules: FilterRules | null) => {
    setDebouncedRules(rules);
  }, 500);

  useEffect(() => {
    debouncedSet(filterRules);
  }, [filterRules, debouncedSet]);

  const hasConditions = debouncedRules && debouncedRules.conditions.length > 0;

  return useQuery<number>({
    queryKey: ['segment-preview', locationId, debouncedRules],
    queryFn: async () => {
      if (!locationId || !debouncedRules) return 0;
      const { data, error } = await supabase.rpc('count_segment_customers', {
        _location_id: locationId,
        _filter_rules: debouncedRules as any,
      });
      if (error) throw error;
      return (data as number) ?? 0;
    },
    enabled: !!locationId && !!hasConditions,
  });
}
