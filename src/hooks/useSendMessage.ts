import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SendMessageParams {
  candidateId: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ candidateId, subject, bodyHtml, bodyText }: SendMessageParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-onboarding-message`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            candidate_id: candidateId,
            subject,
            body_html: bodyHtml,
            body_text: bodyText,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Versturen mislukt');
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-messages', variables.candidateId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-events', variables.candidateId] });
      toast({ title: 'Bericht verstuurd', description: 'Het bericht is succesvol verzonden.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Fout bij versturen', description: error.message, variant: 'destructive' });
    },
  });
}
