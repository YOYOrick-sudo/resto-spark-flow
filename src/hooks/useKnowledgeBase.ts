import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { nestoToast } from '@/lib/nestoToast';

export interface KnowledgeBaseEntry {
  id: string;
  location_id: string;
  category: string;
  question: string | null;
  answer: string;
  source: string;
  is_active: boolean;
  hit_count: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseInput {
  category: string;
  question?: string | null;
  answer: string;
  is_active?: boolean;
}

export function useKnowledgeBase() {
  const { currentLocation } = useUserContext();
  const queryClient = useQueryClient();
  const locationId = currentLocation?.id;
  const queryKey = ['knowledge_base', locationId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('location_id', locationId)
        .order('category')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as KnowledgeBaseEntry[];
    },
    enabled: !!locationId,
  });

  const createEntry = useMutation({
    mutationFn: async (input: KnowledgeBaseInput) => {
      if (!locationId) throw new Error('No location');
      const { error } = await supabase.from('knowledge_base').insert({
        location_id: locationId,
        category: input.category,
        question: input.question || null,
        answer: input.answer,
        is_active: input.is_active ?? true,
        source: 'manual',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      
    },
    onError: () => {
      nestoToast.error('Fout', 'Kon entry niet aanmaken.');
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...input }: KnowledgeBaseInput & { id: string }) => {
      const { error } = await supabase
        .from('knowledge_base')
        .update({
          category: input.category,
          question: input.question || null,
          answer: input.answer,
          is_active: input.is_active,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      
    },
    onError: () => {
      nestoToast.error('Fout', 'Kon entry niet bijwerken.');
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('knowledge_base')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      
    },
    onError: () => {
      nestoToast.error('Fout', 'Kon entry niet verwijderen.');
    },
  });

  return {
    entries: data || [],
    isLoading,
    createEntry,
    updateEntry,
    deleteEntry,
  };
}
