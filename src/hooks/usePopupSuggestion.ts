import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import type { PopupType } from '@/hooks/usePopupConfig';

export interface PopupSuggestion {
  id: string;
  location_id: string;
  popup_type: PopupType;
  headline: string;
  description: string;
  featured_ticket_id: string | null;
  custom_button_url: string | null;
  button_text: string | null;
  reasoning: string;
  status: 'pending' | 'accepted' | 'dismissed';
  dismiss_reason: string | null;
  generated_at: string;
  responded_at: string | null;
  created_at: string;
  tickets?: { name: string; short_description: string | null; color: string } | null;
}

export function usePopupSuggestion() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['popup-suggestion', locationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_popup_suggestions')
        .select('*, tickets(name, short_description, color)')
        .eq('location_id', locationId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PopupSuggestion | null;
    },
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000,
  });
}

// Accept suggestion and apply to a specific popup (or create new one)
export function useAcceptPopupSuggestion() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ suggestion, targetPopupId }: { suggestion: PopupSuggestion; targetPopupId?: string }) => {
      if (!locationId) throw new Error('No location selected');

      const configUpdate: Record<string, unknown> = {
        popup_type: suggestion.popup_type,
        headline: suggestion.headline,
        description: suggestion.description,
        featured_ticket_id: suggestion.featured_ticket_id,
        custom_button_url: suggestion.custom_button_url,
      };
      if (suggestion.button_text) {
        configUpdate.button_text = suggestion.button_text;
      }

      if (targetPopupId) {
        // Update existing popup
        const { error: configError } = await supabase
          .from('marketing_popup_config')
          .update(configUpdate as any)
          .eq('id', targetPopupId);
        if (configError) throw configError;
      } else {
        // Create new popup with suggestion data
        const { error: configError } = await supabase
          .from('marketing_popup_config')
          .insert({ location_id: locationId, name: suggestion.headline, ...configUpdate } as any);
        if (configError) throw configError;
      }

      // Mark suggestion as accepted
      const { error: sugError } = await supabase
        .from('marketing_popup_suggestions')
        .update({ status: 'accepted', responded_at: new Date().toISOString() } as any)
        .eq('id', suggestion.id);
      if (sugError) throw sugError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popup-suggestion', locationId] });
      queryClient.invalidateQueries({ queryKey: ['popup-configs', locationId] });
    },
  });
}

export function useDismissPopupSuggestion() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ suggestionId, reason }: { suggestionId: string; reason: string }) => {
      const { error } = await supabase
        .from('marketing_popup_suggestions')
        .update({
          status: 'dismissed',
          dismiss_reason: reason,
          responded_at: new Date().toISOString(),
        } as any)
        .eq('id', suggestionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['popup-suggestion', locationId] });
    },
  });
}
