import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export interface ContentIdea {
  id: string;
  title: string;
  description: string | null;
  idea_type: string;
  source: string;
  priority: number;
  status: string;
  suggested_date: string | null;
  suggested_content: Record<string, unknown> | null;
}

export function useContentIdeas(limit = 5) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['marketing-content-ideas', locationId, limit],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from('marketing_content_ideas')
        .select('id, title, description, idea_type, source, priority, status, suggested_date, suggested_content')
        .eq('location_id', locationId)
        .eq('status', 'active')
        .order('priority', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as ContentIdea[];
    },
    enabled: !!locationId,
  });
}
