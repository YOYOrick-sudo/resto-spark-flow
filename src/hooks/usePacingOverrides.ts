import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nestoToast } from '@/lib/nestoToast';
import { queryKeys } from '@/lib/queryKeys';

export interface PacingOverride {
  id: string;
  shift_id: string;
  exception_date: string;
  override_pacing_limit_covers: number | null;
  override_pacing_limit_arrivals: number | null;
  override_max_covers_total: number | null;
  override_online_booking_enabled: boolean | null;
}

export function usePacingOverrides(locationId: string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ['pacing-overrides', locationId, date],
    queryFn: async () => {
      if (!locationId || !date) return [];
      const { data, error } = await supabase
        .from('shift_exceptions')
        .select('id, shift_id, exception_date, override_pacing_limit_covers, override_pacing_limit_arrivals, override_max_covers_total, override_online_booking_enabled')
        .eq('location_id', locationId)
        .eq('exception_date', date)
        .not('shift_id', 'is', null);
      if (error) throw error;
      return (data || []) as PacingOverride[];
    },
    enabled: !!locationId && !!date,
  });
}

interface UpsertPacingInput {
  locationId: string;
  shiftId: string;
  date: string;
  overrides: {
    override_pacing_limit_covers: number | null;
    override_pacing_limit_arrivals: number | null;
    override_max_covers_total: number | null;
    override_online_booking_enabled: boolean | null;
  };
}

export function useUpsertPacingOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, shiftId, date, overrides }: UpsertPacingInput) => {
      // Check if exception already exists for this shift+date
      const { data: existing } = await supabase
        .from('shift_exceptions')
        .select('id')
        .eq('location_id', locationId)
        .eq('shift_id', shiftId)
        .eq('exception_date', date)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('shift_exceptions')
          .update(overrides)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shift_exceptions')
          .insert({
            location_id: locationId,
            shift_id: shiftId,
            exception_date: date,
            exception_type: 'modified' as const,
            ...overrides,
          });
        if (error) throw error;
      }

      // Audit log
      await supabase.from('audit_log').insert({
        location_id: locationId,
        entity_type: 'shift_exception',
        entity_id: shiftId,
        action: existing ? 'pacing_override_updated' : 'pacing_override_created',
        actor_type: 'user',
        actor_id: (await supabase.auth.getUser()).data.user?.id ?? null,
        changes: overrides as any,
        metadata: { date, shift_id: shiftId } as any,
      });

      return { locationId, date };
    },
    onSuccess: ({ locationId, date }) => {
      queryClient.invalidateQueries({ queryKey: ['pacing-overrides', locationId, date] });
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftExceptions(locationId), exact: false });
      
    },
    onError: (error: Error) => {
      nestoToast.error('Fout bij opslaan', error.message);
    },
  });
}

export function useResetPacingOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, shiftId, date }: { locationId: string; shiftId: string; date: string }) => {
      const { data: existing } = await supabase
        .from('shift_exceptions')
        .select('id')
        .eq('location_id', locationId)
        .eq('shift_id', shiftId)
        .eq('exception_date', date)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('shift_exceptions')
          .update({
            override_pacing_limit_covers: null,
            override_pacing_limit_arrivals: null,
            override_max_covers_total: null,
            override_online_booking_enabled: null,
          })
          .eq('id', existing.id);

        // Audit log
        await supabase.from('audit_log').insert({
          location_id: locationId,
          entity_type: 'shift_exception',
          entity_id: shiftId,
          action: 'pacing_override_reset',
          actor_type: 'user',
          actor_id: (await supabase.auth.getUser()).data.user?.id ?? null,
          changes: {} as any,
          metadata: { date, shift_id: shiftId } as any,
        });
      }

      return { locationId, date };
    },
    onSuccess: ({ locationId, date }) => {
      queryClient.invalidateQueries({ queryKey: ['pacing-overrides', locationId, date] });
      queryClient.invalidateQueries({ queryKey: queryKeys.shiftExceptions(locationId), exact: false });
      
    },
    onError: (error: Error) => {
      nestoToast.error('Fout bij resetten', error.message);
    },
  });
}
