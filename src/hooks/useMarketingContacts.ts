import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { nestoToast } from '@/lib/nestoToast';
import { format } from 'date-fns';
import type { FilterRules } from './useMarketingSegments';

export interface MarketingContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  total_visits: number;
  last_visit_at: string | null;
  average_spend: number | null;
  total_no_shows: number;
  total_cancellations: number;
  birthday: string | null;
  dietary_preferences: string[] | null;
  tags: any;
  notes: string | null;
  language: string;
  created_at: string;
}

export interface ContactPreference {
  id: string;
  customer_id: string;
  location_id: string;
  channel: string;
  opted_in: boolean;
  opted_in_at: string | null;
  opted_out_at: string | null;
  consent_source: string | null;
  double_opt_in_confirmed: boolean;
}

export function useMarketingContacts(filterRules?: FilterRules | null, search?: string) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery<MarketingContact[]>({
    queryKey: ['marketing-contacts', locationId, filterRules, search],
    queryFn: async () => {
      if (!locationId) return [];

      // Use RPC for filtered results
      const { data, error } = await supabase.rpc('list_segment_customers', {
        _location_id: locationId,
        _filter_rules: filterRules ?? null as any,
        _limit: 200,
        _offset: 0,
      });
      if (error) throw error;

      let results = (data ?? []) as unknown as MarketingContact[];

      // Client-side search filter
      if (search) {
        const q = search.toLowerCase();
        results = results.filter(c =>
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
          (c.email?.toLowerCase().includes(q) ?? false)
        );
      }

      return results;
    },
    enabled: !!locationId,
  });
}

export function useContactPreferences(customerId: string | null) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery<ContactPreference[]>({
    queryKey: ['contact-preferences', locationId, customerId],
    queryFn: async () => {
      if (!locationId || !customerId) return [];
      const { data, error } = await supabase
        .from('marketing_contact_preferences')
        .select('*')
        .eq('location_id', locationId)
        .eq('customer_id', customerId);
      if (error) throw error;
      return (data ?? []) as unknown as ContactPreference[];
    },
    enabled: !!locationId && !!customerId,
  });
}

export function useUpdateContactPreference() {
  const qc = useQueryClient();
  const { currentLocation } = useUserContext();

  return useMutation({
    mutationFn: async (input: { customerId: string; channel: string; optedIn: boolean }) => {
      if (!currentLocation) throw new Error('No location');

      const { data, error } = await supabase
        .from('marketing_contact_preferences')
        .upsert(
          {
            customer_id: input.customerId,
            location_id: currentLocation.id,
            channel: input.channel,
            opted_in: input.optedIn,
            opted_in_at: input.optedIn ? new Date().toISOString() : null,
            opted_out_at: input.optedIn ? null : new Date().toISOString(),
            consent_source: 'manual',
          },
          { onConflict: 'customer_id,location_id,channel', ignoreDuplicates: false }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['contact-preferences', currentLocation?.id, vars.customerId] });
    },
  });
}

export function useNewContactsThisMonth() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery<number>({
    queryKey: ['new-contacts-month', locationId],
    queryFn: async () => {
      if (!locationId) return 0;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .gte('created_at', startOfMonth.toISOString());

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!locationId,
  });
}

export async function exportContactsCsv(
  locationId: string,
  filterRules?: FilterRules | null,
  search?: string
) {
  const { data, error } = await supabase.rpc('list_segment_customers', {
    _location_id: locationId,
    _filter_rules: filterRules ?? null as any,
    _limit: 10000,
    _offset: 0,
  });
  if (error) throw error;

  let results = (data ?? []) as unknown as MarketingContact[];

  if (search) {
    const q = search.toLowerCase();
    results = results.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false)
    );
  }

  const formatDate = (d: string | null) => {
    if (!d) return '';
    try {
      return format(new Date(d), 'dd-MM-yyyy');
    } catch {
      return '';
    }
  };

  const header = 'Voornaam;Achternaam;Email;Telefoon;Bezoeken;Laatste bezoek;Gem. besteding;Tags';
  const csvRows = results.map(c => [
    c.first_name,
    c.last_name,
    c.email ?? '',
    c.phone_number ?? '',
    String(c.total_visits),
    formatDate(c.last_visit_at),
    c.average_spend != null ? Number(c.average_spend).toFixed(2) : '',
    Array.isArray(c.tags) ? (c.tags as string[]).join(',') : '',
  ].join(';'));

  const csv = [header, ...csvRows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nesto-contacten-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  nestoToast.success('Export gedownload');
}
