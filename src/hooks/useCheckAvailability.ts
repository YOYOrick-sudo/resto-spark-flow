import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import type { AvailabilityResponse } from '@/types/availability';

interface UseCheckAvailabilityParams {
  location_id: string | null;
  date: string | null;         // YYYY-MM-DD
  party_size: number | null;
  ticket_id?: string | null;
  channel?: 'widget' | 'operator';
}

export function useCheckAvailability({
  location_id,
  date,
  party_size,
  ticket_id,
  channel,
}: UseCheckAvailabilityParams) {
  const { isAuthenticated } = useAuth();
  
  // Auto-detect channel: logged in = operator, anonymous = widget
  const resolvedChannel = channel ?? (isAuthenticated ? 'operator' : 'widget');

  return useQuery<AvailabilityResponse>({
    queryKey: queryKeys.availability(
      location_id ?? '',
      date ?? '',
      party_size ?? 0,
      ticket_id ?? undefined
    ),
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-availability', {
        body: {
          location_id,
          date,
          party_size,
          ticket_id: ticket_id ?? undefined,
          channel: resolvedChannel,
        },
      });

      if (error) throw error;
      return data as AvailabilityResponse;
    },
    enabled: !!location_id && !!date && !!party_size && party_size > 0,
    staleTime: 30_000, // 30 seconds
  });
}
