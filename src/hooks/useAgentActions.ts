import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

export interface AgentAction {
  id: string;
  location_id: string;
  action_type: string;
  title: string;
  beschrijving: string | null;
  status: string | null;
  action_data: any;
  referentie_id: string | null;
  referentie_type: string | null;
  goedgekeurd_door: string | null;
  goedgekeurd_op: string | null;
  verloopt_op: string | null;
  created_at: string | null;
}

export function useAgentActions() {
  const { currentLocation, context } = useUserContext();
  const queryClient = useQueryClient();
  const locationId = currentLocation?.id;

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['agent-actions', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from('agent_actions')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as AgentAction[];
    },
    enabled: !!locationId,
  });

  const pendingActions = actions.filter((a) => a.status === 'concept');
  const recentActions = actions.filter((a) => a.status !== 'concept');

  const approve = useMutation({
    mutationFn: async (actionId: string) => {
      const userId = context?.user_id;

      // Call execute-agent-action edge function
      const { error: fnError } = await supabase.functions.invoke('execute-agent-action', {
        body: { action_id: actionId, user_id: userId },
      });

      if (fnError) {
        // Fallback: just update status directly
        console.error('[APPROVE] Edge function error, falling back:', fnError);
        const { error } = await supabase
          .from('agent_actions')
          .update({
            status: 'goedgekeurd',
            goedgekeurd_door: userId,
            goedgekeurd_op: new Date().toISOString(),
          })
          .eq('id', actionId);
        if (error) throw error;

        if (locationId && userId) {
          await supabase.from('agent_feedback').insert({
            location_id: locationId,
            action_id: actionId,
            feedback_type: 'approved',
            given_by: userId,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-actions', locationId] });
      queryClient.invalidateQueries({ queryKey: ['pending-actions', locationId] });
    },
  });

  const reject = useMutation({
    mutationFn: async (actionId: string) => {
      const userId = context?.user_id;
      const { error } = await supabase
        .from('agent_actions')
        .update({ status: 'afgewezen' })
        .eq('id', actionId);
      if (error) throw error;

      if (locationId && userId) {
        await supabase.from('agent_feedback').insert({
          location_id: locationId,
          action_id: actionId,
          feedback_type: 'rejected',
          given_by: userId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-actions', locationId] });
      queryClient.invalidateQueries({ queryKey: ['pending-actions', locationId] });
    },
  });

  return { actions, pendingActions, recentActions, isLoading, approve, reject };
}
