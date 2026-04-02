import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDayNote(date: string, locationId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['day-note', locationId, date];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!locationId) return null;
      const { data, error } = await supabase
        .from('day_notes')
        .select('*')
        .eq('location_id', locationId)
        .eq('date', date)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!locationId && !!date,
  });

  const upsert = useMutation({
    mutationFn: async (content: string) => {
      if (!locationId) throw new Error('No location');
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('day_notes')
        .upsert(
          { location_id: locationId, date, content, created_by: user?.id ?? null },
          { onConflict: 'location_id,date' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    note: query.data,
    isLoading: query.isLoading,
    hasNote: !!query.data?.content?.trim(),
    saveNote: upsert.mutate,
    isSaving: upsert.isPending,
  };
}
