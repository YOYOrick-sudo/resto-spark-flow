
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nestoToast } from '@/lib/nestoToast';
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

      if (dateRange?.from) query = query.gte('exception_date', dateRange.from);
      if (dateRange?.to) query = query.lte('exception_date', dateRange.to);

      const { data, error } = await query;
      if (error) throw error;
      return data as ShiftException[];
    },
    enabled: !!locationId,
  });
}

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

export function useCreateShiftException() {
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftExceptions(data.location_id), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.effectiveSchedule(data.location_id, data.exception_date), exact: false });

      const typeLabels: Record<string, string> = {
        closed: 'Gesloten',
        modified: 'Aangepast',
        special: 'Speciaal',
      };

      nestoToast.success('Uitzondering aangemaakt', `${typeLabels[data.exception_type] || data.exception_type} op ${data.exception_date}`);
    },
    onError: (error: Error) => {
      nestoToast.error('Fout bij aanmaken', error.message);
    },
  });
}

export function useUpdateShiftException() {
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftExceptions(data.location_id), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.effectiveSchedule(data.location_id, data.exception_date), exact: false });
      nestoToast.success('Uitzondering bijgewerkt', 'De wijzigingen zijn opgeslagen.');
    },
    onError: (error: Error) => {
      nestoToast.error('Fout bij opslaan', error.message);
    },
  });
}

export function useDeleteShiftException() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exceptionId: string) => {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftExceptions(locationId), exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.effectiveSchedule(locationId, date), exact: false });
      nestoToast.success('Uitzondering verwijderd', 'De uitzondering is verwijderd.');
    },
    onError: (error: Error) => {
      nestoToast.error('Fout bij verwijderen', error.message);
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

export function useBulkCreateShiftExceptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      locationId,
      exceptions,
      replaceConflicts,
      onProgress,
    }: BulkCreateInput): Promise<BulkCreateResult> => {
      let replaced = 0;

      if (replaceConflicts && replaceConflicts.dates.length > 0) {
        let deleteQuery = supabase
          .from('shift_exceptions')
          .delete()
          .eq('location_id', locationId)
          .in('exception_date', replaceConflicts.dates);

        if (replaceConflicts.shiftId === null) {
          deleteQuery = deleteQuery.is('shift_id', null);
        } else {
          deleteQuery = deleteQuery.eq('shift_id', replaceConflicts.shiftId);
        }

        const { error: deleteError, count } = await deleteQuery;
        if (deleteError) throw deleteError;
        replaced = count || 0;
      }

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

      return { created: inserted, replaced, locationId };
    },
    onSuccess: ({ created, replaced, locationId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftExceptions(locationId), exact: false });

      const message = replaced > 0
        ? `${created} uitzonderingen aangemaakt, ${replaced} vervangen.`
        : `${created} uitzonderingen aangemaakt.`;

      nestoToast.success('Bulk uitzonderingen aangemaakt', message);
    },
    onError: (error: Error) => {
      nestoToast.error('Fout bij bulk aanmaken', error.message);
    },
  });
}
