// ============================================
// FASE 4.3.A: Shift Exceptions Hooks
// Query and mutation hooks for shift exception management
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/queryKeys';
import type {
  ShiftException,
  CreateShiftExceptionInput,
  UpdateShiftExceptionInput,
} from '@/types/shifts';

// ============================================
// Query Hooks
// ============================================

interface DateRange {
  from: string;
  to: string;
}

/**
 * Fetch shift exceptions for a location, optionally filtered by date range
 */
export function useShiftExceptions(
  locationId: string | undefined,
  dateRange?: DateRange
) {
  return useQuery({
    queryKey: [
      ...queryKeys.shiftExceptions(locationId ?? ''),
      dateRange?.from,
      dateRange?.to,
    ],
    queryFn: async () => {
      if (!locationId) return [];
      
      let query = supabase
        .from('shift_exceptions')
        .select('*, shift:shifts(*)')
        .eq('location_id', locationId)
        .order('exception_date', { ascending: true });

      if (dateRange?.from) {
        query = query.gte('exception_date', dateRange.from);
      }
      if (dateRange?.to) {
        query = query.lte('exception_date', dateRange.to);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ShiftException[];
    },
    enabled: !!locationId,
  });
}

/**
 * Fetch exceptions for a specific date
 */
export function useShiftExceptionsForDate(
  locationId: string | undefined,
  date: string | undefined
) {
  return useQuery({
    queryKey: [...queryKeys.shiftExceptions(locationId ?? ''), 'date', date],
    queryFn: async () => {
      if (!locationId || !date) return [];
      
      const { data, error } = await supabase
        .from('shift_exceptions')
        .select('*, shift:shifts(*)')
        .eq('location_id', locationId)
        .eq('exception_date', date);

      if (error) throw error;
      return data as ShiftException[];
    },
    enabled: !!locationId && !!date,
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Create a new shift exception
 */
export function useCreateShiftException() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateShiftExceptionInput) => {
      const { data, error } = await supabase
        .from('shift_exceptions')
        .insert(input)
        .select('*, shift:shifts(*)')
        .single();

      if (error) throw error;
      return data as ShiftException;
    },
    onSuccess: (data) => {
      // Invalidate exceptions list
      queryClient.invalidateQueries({
        queryKey: queryKeys.shiftExceptions(data.location_id),
        exact: false,
      });
      // Invalidate effective schedule for this date
      queryClient.invalidateQueries({
        queryKey: queryKeys.effectiveSchedule(data.location_id, data.exception_date),
        exact: false,
      });
      
      const typeLabels: Record<string, string> = {
        closed: 'Gesloten',
        modified: 'Aangepast',
        special: 'Speciaal',
      };
      
      toast({
        title: 'Uitzondering aangemaakt',
        description: `${typeLabels[data.exception_type] || data.exception_type} op ${data.exception_date}`,
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
 * Update an existing shift exception
 */
export function useUpdateShiftException() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateShiftExceptionInput) => {
      const { data, error } = await supabase
        .from('shift_exceptions')
        .update(updates)
        .eq('id', id)
        .select('*, shift:shifts(*)')
        .single();

      if (error) throw error;
      return data as ShiftException;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.shiftExceptions(data.location_id),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.effectiveSchedule(data.location_id, data.exception_date),
        exact: false,
      });
      
      toast({
        title: 'Uitzondering bijgewerkt',
        description: 'De wijzigingen zijn opgeslagen.',
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
 * Delete a shift exception (hard delete)
 */
export function useDeleteShiftException() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (exceptionId: string) => {
      // First get the exception to know location_id and date
      const { data: exception, error: fetchError } = await supabase
        .from('shift_exceptions')
        .select('location_id, exception_date')
        .eq('id', exceptionId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('shift_exceptions')
        .delete()
        .eq('id', exceptionId);

      if (error) throw error;
      return { 
        exceptionId, 
        locationId: exception.location_id, 
        date: exception.exception_date,
      };
    },
    onSuccess: ({ locationId, date }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.shiftExceptions(locationId),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.effectiveSchedule(locationId, date),
        exact: false,
      });
      
      toast({
        title: 'Uitzondering verwijderd',
        description: 'De uitzondering is verwijderd.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fout bij verwijderen',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
