import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export interface MarketingTemplate {
  id: string;
  name: string;
  category: string;
  template_type: string;
  is_active: boolean;
  is_system: boolean;
  location_id: string | null;
}

export function useMarketingTemplates(category?: string) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['marketing-templates', locationId, category],
    queryFn: async () => {
      let query = supabase
        .from('marketing_templates')
        .select('id, name, category, template_type, is_active, is_system, location_id')
        .or(`location_id.eq.${locationId},location_id.is.null`)
        .eq('is_active', true);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.order('name');
      if (error) throw error;
      return (data ?? []) as MarketingTemplate[];
    },
    enabled: !!locationId,
  });
}
