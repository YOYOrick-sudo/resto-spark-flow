import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { queryKeys } from '@/lib/queryKeys';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useState, useEffect } from 'react';
import type { Customer } from '@/types/reservation';

export function useCustomers(searchTerm?: string) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm ?? '');

  const debouncedSet = useDebouncedCallback((val: string) => {
    setDebouncedSearch(val);
  }, 300);

  useEffect(() => {
    debouncedSet(searchTerm ?? '');
  }, [searchTerm, debouncedSet]);

  const query = useQuery<Customer[]>({
    queryKey: [...queryKeys.customers(locationId ?? ''), debouncedSearch],
    queryFn: async () => {
      if (!locationId) return [];

      let q = supabase
        .from('customers')
        .select('*')
        .eq('location_id', locationId)
        .order('last_name', { ascending: true })
        .limit(100);

      if (debouncedSearch && debouncedSearch.length >= 2) {
        q = q.or(
          `first_name.ilike.%${debouncedSearch}%,last_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,phone_number.ilike.%${debouncedSearch}%`
        );
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Customer[];
    },
    enabled: !!locationId,
  });

  return query;
}
