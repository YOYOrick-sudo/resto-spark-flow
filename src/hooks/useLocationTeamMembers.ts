import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export interface TeamMember {
  user_id: string;
  name: string | null;
  email: string;
  role: string;
}

export function useLocationTeamMembers() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['location-team-members', locationId],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await supabase
        .from('user_location_roles')
        .select('user_id, role, profiles:user_id(name, email)')
        .eq('location_id', locationId!);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        user_id: row.user_id,
        name: row.profiles?.name ?? null,
        email: row.profiles?.email ?? '',
        role: row.role,
      }));
    },
    enabled: !!locationId,
  });
}
