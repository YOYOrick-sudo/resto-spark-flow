// ============================================
// FASE 4.3.A + 4.3.D: Shift Exceptions Hooks
// Query and mutation hooks for shift exception management
// Includes bulk create for enterprise recurring patterns
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
// Utility Functions
// ============================================

function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

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

// ============================================
// Bulk Create Hook (Fase 4.3.D)
// ============================================

interface BulkCreateInput {
  locationId: string;
  exceptions: CreateShiftExceptionInput[];
  replaceConflicts?: {
    dates: string[];
    shiftId: string | null;
  };
  onProgress?: (completed: number, total: number) => void;
}

interface BulkCreateResult {
  created: number;
  replaced: number;
  locationId: string;
}

const BATCH_SIZE = 100;

/**
 * Bulk create shift exceptions with batch processing
 * Supports skip or replace for conflicts
 */
export function useBulkCreateShiftExceptions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      locationId,
      exceptions,
      replaceConflicts,
      onProgress,
    }: BulkCreateInput): Promise<BulkCreateResult> => {
      let replaced = 0;

      // Step 1: Delete conflicts if replace mode is selected
      if (replaceConflicts && replaceConflicts.dates.length > 0) {
        // Build the delete query
        let deleteQuery = supabase
          .from('shift_exceptions')
          .delete()
          .eq('location_id', locationId)
          .in('exception_date', replaceConflicts.dates);

        // Handle null shift_id separately (Supabase requires .is() for null)
        if (replaceConflicts.shiftId === null) {
          deleteQuery = deleteQuery.is('shift_id', null);
        } else {
          deleteQuery = deleteQuery.eq('shift_id', replaceConflicts.shiftId);
        }

        const { error: deleteError, count } = await deleteQuery;
        if (deleteError) throw deleteError;
        replaced = count || 0;
      }

      // Step 2: Batch insert exceptions
      const batches = chunkArray(exceptions, BATCH_SIZE);
      let inserted = 0;

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        const { error } = await supabase
          .from('shift_exceptions')
          .insert(batch);

        if (error) throw error;

        inserted += batch.length;
        onProgress?.(inserted, exceptions.length);
      }

      return {
        created: inserted,
        replaced,
        locationId,
      };
    },
    onSuccess: ({ created, replaced, locationId }) => {
      // Invalidate all exception queries for this location
      queryClient.invalidateQueries({
        queryKey: queryKeys.shiftExceptions(locationId),
        exact: false,
      });

      const message = replaced > 0
        ? `${created} uitzonderingen aangemaakt, ${replaced} vervangen.`
        : `${created} uitzonderingen aangemaakt.`;

      toast({
        title: 'Bulk uitzonderingen aangemaakt',
        description: message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Fout bij bulk aanmaken',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
