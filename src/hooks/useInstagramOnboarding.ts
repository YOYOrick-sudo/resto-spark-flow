import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nestoToast } from '@/lib/nestoToast';

interface OnboardingResult {
  imported: number;
  insights_fetched: number;
  classified: number;
}

export function useInstagramOnboarding() {
  return useMutation({
    mutationFn: async ({ account_id }: { account_id: string }): Promise<OnboardingResult> => {
      const { data, error } = await supabase.functions.invoke('marketing-onboard-instagram', {
        body: { account_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as OnboardingResult;
    },
    onSuccess: (data) => {
      nestoToast.success(
        'Instagram gekoppeld',
        `${data.imported} posts geïmporteerd, ${data.classified} geclassificeerd.`
      );
    },
    onError: (error) => {
      const msg = error instanceof Error ? error.message : 'Importeren mislukt';
      nestoToast.error('Instagram import mislukt', msg);
    },
  });
}
