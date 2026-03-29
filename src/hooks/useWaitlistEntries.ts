import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export interface WaitlistEntry {
  id: string;
  location_id: string;
  date: string;
  party_size: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  notes: string | null;
  preferred_time_from: string | null;
  preferred_time_to: string | null;
  status: string;
  priority_score: number;
  customer_id: string | null;
  shift_id: string | null;
  ticket_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaitlistInvite {
  id: string;
  waitlist_entry_id: string;
  slot_date: string;
  slot_time: string;
  party_size: number;
  status: string;
  expires_at: string;
  accepted_at: string | null;
}

export interface WaitlistEntryWithInvites extends WaitlistEntry {
  invites: WaitlistInvite[];
}

export function useWaitlistEntries(date: string) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['waitlist-entries', locationId, date],
    queryFn: async () => {
      if (!locationId) return [];

      const { data, error } = await supabase
        .from('waitlist_entries')
        .select('*')
        .eq('location_id', locationId)
        .eq('date', date)
        .order('priority_score', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch invites for these entries
      const entryIds = (data ?? []).map((e: WaitlistEntry) => e.id);
      let invites: WaitlistInvite[] = [];
      if (entryIds.length > 0) {
        const { data: invData } = await supabase
          .from('waitlist_invites')
          .select('*')
          .in('waitlist_entry_id', entryIds);
        invites = (invData ?? []) as WaitlistInvite[];
      }

      return (data ?? []).map((entry: WaitlistEntry) => ({
        ...entry,
        invites: invites.filter((i) => i.waitlist_entry_id === entry.id),
      })) as WaitlistEntryWithInvites[];
    },
    enabled: !!locationId && !!date,
    refetchInterval: 30000, // 30s
  });
}

export function useCancelWaitlistEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('waitlist_entries')
        .update({ status: 'cancelled' })
        .eq('id', entryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist-entries'] });
    },
  });
}
