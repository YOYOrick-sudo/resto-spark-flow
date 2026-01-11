// ============================================
// FASE 4.3.A: Shifts Hooks
// Query and mutation hooks for shift management
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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

/**
 * Fetch all active shifts for a location, ordered by sort_order
 */
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

/**
 * Fetch all shifts for a location (including inactive)
 */
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

/**
 * Fetch a single shift by ID
 */
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

/**
 * Fetch effective shift schedule for a specific date via RPC
 */
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

/**
 * Create a new shift
 */
export function useCreateShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      queryClient.invalidateQueries({
        queryKey: queryKeys.shifts(data.location_id),
        exact: false,
      });
      toast({
        title: 'Shift aangemaakt',
        description: `${data.name} is toegevoegd.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fout bij aanmaken',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update an existing shift
 */
export function useUpdateShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      queryClient.invalidateQueries({
        queryKey: queryKeys.shifts(data.location_id),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.shift(data.id),
        exact: false,
      });
      toast({
        title: 'Shift bijgewerkt',
        description: `${data.name} is opgeslagen.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fout bij opslaan',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Archive a shift (soft delete by setting is_active = false)
 */
export function useArchiveShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (shiftId: string) => {
      // First get the shift to know the location_id
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.shifts(locationId),
        exact: false,
      });
      toast({
        title: 'Shift gearchiveerd',
        description: `${name} is gearchiveerd.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fout bij archiveren',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Restore an archived shift
 */
export function useRestoreShift() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      queryClient.invalidateQueries({
        queryKey: queryKeys.shifts(locationId),
        exact: false,
      });
      toast({
        title: 'Shift hersteld',
        description: `${name} is weer actief.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fout bij herstellen',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
