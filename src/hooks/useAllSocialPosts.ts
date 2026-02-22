import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import type { SocialPost } from './useMarketingSocialPosts';

export function useABTestResults(abTestId: string | null) {
  return useQuery({
    queryKey: ['ab-test-results', abTestId],
    queryFn: async () => {
      if (!abTestId) return [];
      const { data, error } = await supabase
        .from('marketing_social_posts')
        .select('*')
        .eq('ab_test_id', abTestId)
        .order('ab_test_group', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SocialPost[];
    },
    enabled: !!abTestId,
  });
}

interface SocialPostFilters {
  platform?: string;
  status?: string;
}

export function useAllSocialPosts(filters: SocialPostFilters = {}) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['all-social-posts', locationId, filters.platform, filters.status],
    queryFn: async () => {
      if (!locationId) return [];
      let query = supabase
        .from('marketing_social_posts')
        .select('*')
        .eq('location_id', locationId)
        .order('scheduled_at', { ascending: false });

      if (filters.platform) {
        query = query.eq('platform', filters.platform);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as SocialPost[];
    },
    enabled: !!locationId,
  });
}

export function useSocialPost(id: string | undefined) {
  return useQuery({
    queryKey: ['social-post', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('marketing_social_posts')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as SocialPost;
    },
    enabled: !!id,
  });
}

export function usePublishSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase.functions.invoke('marketing-publish-social', {
        body: { post_id: postId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-social-posts'] });
    },
  });
}

export function useCreateFullSocialPost() {
  const queryClient = useQueryClient();
  const { currentLocation } = useUserContext();

  return useMutation({
    mutationFn: async (input: {
      platform: string;
      content_text: string;
      hashtags: string[];
      scheduled_at?: string;
      content_type_tag?: string;
      status: string;
      is_recurring?: boolean;
      recurrence_rule?: Record<string, unknown>;
      alternative_caption?: string;
      ai_original_caption?: string;
      operator_edited?: boolean;
      ab_test_group?: string;
      ab_test_id?: string;
      media_urls?: string[];
    }) => {
      if (!currentLocation) throw new Error('No location selected');
      const row = {
        location_id: currentLocation.id,
        platform: input.platform,
        content_text: input.content_text,
        hashtags: input.hashtags,
        scheduled_at: input.scheduled_at ?? null,
        content_type_tag: input.content_type_tag ?? null,
        status: input.status,
        is_recurring: input.is_recurring ?? false,
        recurrence_rule: input.recurrence_rule ?? null,
        alternative_caption: input.alternative_caption ?? null,
        ai_original_caption: input.ai_original_caption ?? null,
        operator_edited: input.operator_edited ?? false,
        ab_test_group: input.ab_test_group ?? null,
        ab_test_id: input.ab_test_id ?? null,
        media_urls: input.media_urls ?? [],
      };
      const { data, error } = await supabase
        .from('marketing_social_posts')
        .insert(row as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-social-posts'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-social-posts'] });
    },
  });
}
