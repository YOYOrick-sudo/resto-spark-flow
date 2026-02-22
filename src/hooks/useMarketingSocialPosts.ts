import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface SocialPost {
  id: string;
  location_id: string;
  platform: string;
  post_type: string;
  content_text: string | null;
  hashtags: string[];
  media_urls: string[];
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  is_recurring: boolean;
  recurrence_rule: Record<string, unknown> | null;
  content_type_tag: string | null;
  alternative_caption: string | null;
  ai_generated: boolean;
  created_at: string;
  campaign_id: string | null;
  created_by: string | null;
  external_post_id: string | null;
  analytics: Record<string, unknown>;
}

export function useMarketingSocialPosts(month: Date) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const year = month.getFullYear();
  const monthNum = month.getMonth();

  return useQuery({
    queryKey: ['marketing-social-posts', locationId, year, monthNum],
    queryFn: async () => {
      if (!locationId) return [];
      const start = startOfMonth(month).toISOString();
      const end = endOfMonth(month).toISOString();
      const { data, error } = await supabase
        .from('marketing_social_posts')
        .select('*')
        .eq('location_id', locationId)
        .gte('scheduled_at', start)
        .lte('scheduled_at', end)
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SocialPost[];
    },
    enabled: !!locationId,
  });
}

/** Group posts by day key (YYYY-MM-DD) */
export function groupPostsByDay(posts: SocialPost[]): Record<string, SocialPost[]> {
  const grouped: Record<string, SocialPost[]> = {};
  for (const post of posts) {
    if (!post.scheduled_at) continue;
    const key = format(new Date(post.scheduled_at), 'yyyy-MM-dd');
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(post);
  }
  return grouped;
}

export function useCreateSocialPost() {
  const queryClient = useQueryClient();
  const { currentLocation } = useUserContext();

  return useMutation({
    mutationFn: async (input: {
      platform: string;
      content_text: string;
      hashtags: string[];
      scheduled_at: string;
      content_type_tag?: string;
    }) => {
      if (!currentLocation) throw new Error('No location selected');
      const { data, error } = await supabase
        .from('marketing_social_posts')
        .insert({
          location_id: currentLocation.id,
          platform: input.platform,
          content_text: input.content_text,
          hashtags: input.hashtags,
          scheduled_at: input.scheduled_at,
          content_type_tag: input.content_type_tag ?? null,
          status: 'scheduled',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-social-posts'] });
    },
  });
}

export function useUpdateSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; scheduled_at: string }) => {
      const { error } = await supabase
        .from('marketing_social_posts')
        .update({ scheduled_at: input.scheduled_at })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-social-posts'] });
    },
  });
}

export function useDeleteSocialPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketing_social_posts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-social-posts'] });
    },
  });
}
