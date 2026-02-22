import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nestoToast } from '@/lib/nestoToast';

interface SocialContentInput {
  context?: string;
  platforms: string[];
  content_type_tag?: string;
}

interface SocialContentResult {
  platforms: {
    instagram?: { caption: string; hashtags: string[] };
    facebook?: { caption: string };
    google_business?: { caption: string };
  };
  suggested_hashtags: string[];
  suggested_time?: string;
  suggested_day?: string;
  photo_suggestion?: string;
  content_type?: string;
}

interface EmailContentInput {
  email_body: string;
  instruction: string;
}

interface EmailContentResult {
  updated_body: string;
}

function handleAIError(error: unknown) {
  const msg = error instanceof Error ? error.message : 'Genereren mislukt';
  if (msg.includes('429') || msg.includes('Te veel verzoeken')) {
    nestoToast.error('Te veel verzoeken, probeer het later opnieuw');
  } else if (msg.includes('402') || msg.includes('credits')) {
    nestoToast.error('AI credits zijn op');
  } else {
    nestoToast.error('Genereren mislukt');
  }
}

export function useGenerateSocialContent() {
  return useMutation({
    mutationFn: async (input: SocialContentInput): Promise<SocialContentResult> => {
      const { data, error } = await supabase.functions.invoke('marketing-generate-content', {
        body: { type: 'social', ...input },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as SocialContentResult;
    },
    onError: handleAIError,
  });
}

export function useGenerateEmailContent() {
  return useMutation({
    mutationFn: async (input: EmailContentInput): Promise<EmailContentResult> => {
      const { data, error } = await supabase.functions.invoke('marketing-generate-content', {
        body: { type: 'email', ...input },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as EmailContentResult;
    },
    onError: handleAIError,
  });
}
