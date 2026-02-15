
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nestoToast } from '@/lib/nestoToast';
import { queryKeys } from '@/lib/queryKeys';
import type {
  Shift,
  EffectiveShiftSchedule,
  CreateShiftInput,
  UpdateShiftInput,
} from '@/types/shifts';

// ============================================
// Query Hooks
// ============================================

export function useShifts(locationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.shifts(locationId ?? ''),
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('location_id', locationId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data as Shift[];
    },
    enabled: !!locationId,
  });
}

export function useAllShifts(locationId: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.shifts(locationId ?? ''), 'all'],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('location_id', locationId)
        .order('sort_order', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data as Shift[];
    },
    enabled: !!locationId,
  });
}

export function useShift(shiftId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.shift(shiftId ?? ''),
    queryFn: async () => {
      if (!shiftId) return null;
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', shiftId)
        .single();
      if (error) throw error;
      return data as Shift;
    },
    enabled: !!shiftId,
  });
}

export function useEffectiveShiftSchedule(
  locationId: string | undefined,
  date: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.effectiveSchedule(locationId ?? '', date ?? ''),
    queryFn: async () => {
      if (!locationId || !date) return [];
      const { data, error } = await supabase.rpc('get_effective_shift_schedule', {
        _location_id: locationId,
        _date: date,
      });
      if (error) throw error;
      return (data ?? []) as EffectiveShiftSchedule[];
    },
    enabled: !!locationId && !!date,
  });
}

// ============================================
// Mutation Hooks
// ============================================

export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateShiftInput) => {
      const { data, error } = await supabase
        .from('shifts')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Shift;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts(data.location_id), exact: false });
      nestoToast.success('Shift aangemaakt', `${data.name} is toegevoegd.`);
    },
    onError: (error: Error) => {
      nestoToast.error('Fout bij aanmaken', error.message);
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateShiftInput) => {
      const { data, error } = await supabase
        .from('shifts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Shift;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts(data.location_id), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.shift(data.id), exact: false });
      nestoToast.success('Shift bijgewerkt', `${data.name} is opgeslagen.`);
    },
    onError: (error: Error) => {
      nestoToast.error('Fout bij opslaan', error.message);
    },
  });
}

export function useArchiveShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shiftId: string) => {
      const { data: shift, error: fetchError } = await supabase
        .from('shifts')
        .select('location_id, name')
        .eq('id', shiftId)
        .single();
      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('shifts')
        .update({ is_active: false })
        .eq('id', shiftId);
      if (error) throw error;
      return { shiftId, locationId: shift.location_id, name: shift.name };
    },
    onSuccess: ({ locationId, name }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts(locationId), exact: false });
      nestoToast.success('Shift gearchiveerd', `${name} is gearchiveerd.`);
    },
    onError: (error: Error) => {
      nestoToast.error('Fout bij archiveren', error.message);
    },
  });
}

export function useRestoreShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shiftId: string) => {
      const { data: shift, error: fetchError } = await supabase
        .from('shifts')
        .select('location_id, name')
        .eq('id', shiftId)
        .single();
      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('shifts')
        .update({ is_active: true })
        .eq('id', shiftId);
      if (error) throw error;
      return { shiftId, locationId: shift.location_id, name: shift.name };
    },
    onSuccess: ({ locationId, name }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts(locationId), exact: false });
      nestoToast.success('Shift hersteld', `${name} is weer actief.`);
    },
    onError: (error: Error) => {
      nestoToast.error('Fout bij herstellen', error.message);
    },
  });
}

// ============================================
// Reorder Hook
// ============================================

export function useReorderShifts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, shiftIds }: { locationId: string; shiftIds: string[] }) => {
      const { data, error } = await supabase.rpc('reorder_shifts', {
        _location_id: locationId,
        _shift_ids: shiftIds,
      });
      if (error) throw error;
      return data as { success: boolean; changed: boolean; count?: number };
    },
    onSuccess: (_, { locationId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shifts(locationId), exact: false });
    },
    onError: (error: Error) => {
      nestoToast.error('Fout bij herschikken', error.message);
    },
  });
}

// ============================================
// Sort Order Helper
// ============================================

export async function getNextShiftSortOrder(locationId: string): Promise<number> {
  const { data } = await supabase
    .from('shifts')
    .select('sort_order')
    .eq('location_id', locationId)
    .eq('is_active', true)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  return (data?.sort_order ?? 0) + 10;
}
