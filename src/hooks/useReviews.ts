import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { nestoToast } from '@/lib/nestoToast';

export interface ReviewFilters {
  platform?: string;
  rating?: number;
  sentiment?: string;
  responded?: 'all' | 'yes' | 'no';
}

export function useReviews(filters: ReviewFilters = {}) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['marketing-reviews', locationId, filters],
    enabled: !!locationId,
    queryFn: async () => {
      let query = supabase
        .from('marketing_reviews')
        .select('*')
        .eq('location_id', locationId!)
        .order('published_at', { ascending: false, nullsFirst: false });

      if (filters.platform) query = query.eq('platform', filters.platform);
      if (filters.rating) query = query.eq('rating', filters.rating);
      if (filters.sentiment) query = query.eq('sentiment', filters.sentiment);
      if (filters.responded === 'yes') query = query.not('response_text', 'is', null);
      if (filters.responded === 'no') query = query.is('response_text', null);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useReviewStats() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['marketing-review-stats', locationId],
    enabled: !!locationId,
    queryFn: async () => {
      // Get Google aggregates from brand_intelligence
      const { data: intel } = await supabase
        .from('marketing_brand_intelligence')
        .select('engagement_baseline')
        .eq('location_id', locationId!)
        .maybeSingle();

      const baseline = (intel?.engagement_baseline as Record<string, unknown>) || {};

      // Get local review stats
      const { data: reviews } = await supabase
        .from('marketing_reviews')
        .select('id, rating, sentiment, response_text')
        .eq('location_id', locationId!);

      const allReviews = reviews || [];
      const total = allReviews.length;
      const responded = allReviews.filter(r => r.response_text).length;
      const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;

      // Sentiment counts
      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
      for (const r of allReviews) {
        if (r.sentiment === 'positive') sentimentCounts.positive++;
        else if (r.sentiment === 'negative') sentimentCounts.negative++;
        else sentimentCounts.neutral++;
      }

      // Rating distribution
      const ratingDist = [0, 0, 0, 0, 0]; // index 0 = 1 star
      for (const r of allReviews) {
        if (r.rating >= 1 && r.rating <= 5) ratingDist[r.rating - 1]++;
      }

      return {
        googleRating: (baseline.google_rating as number) ?? null,
        googleReviewCount: (baseline.google_review_count as number) ?? null,
        localReviewCount: total,
        responseRate,
        sentimentCounts,
        ratingDistribution: ratingDist,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeaturedReviews() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['marketing-featured-reviews', locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_reviews')
        .select('id, author_name, rating, review_text')
        .eq('location_id', locationId!)
        .eq('is_featured', true)
        .not('review_text', 'is', null)
        .order('published_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      response_text?: string;
      is_featured?: boolean;
      responded_at?: string;
      operator_edited?: boolean;
    }) => {
      const updates: Record<string, unknown> = {};
      if (params.response_text !== undefined) updates.response_text = params.response_text;
      if (params.is_featured !== undefined) updates.is_featured = params.is_featured;
      if (params.responded_at !== undefined) updates.responded_at = params.responded_at;
      if (params.operator_edited !== undefined) updates.operator_edited = params.operator_edited;

      const { error } = await supabase
        .from('marketing_reviews')
        .update(updates)
        .eq('id', params.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-review-stats'] });
    },
  });
}

export function useGenerateReviewResponse() {
  return useMutation({
    mutationFn: async (params: { reviewId: string; reviewText: string; authorName: string; rating: number }) => {
      const { data, error } = await supabase.functions.invoke('marketing-generate-content', {
        body: {
          type: 'review_response',
          review_text: params.reviewText,
          author_name: params.authorName,
          rating: params.rating,
        },
      });

      if (error) throw error;

      // Save the generated response
      if (data?.content) {
        await supabase
          .from('marketing_reviews')
          .update({ ai_suggested_response: data.content })
          .eq('id', params.reviewId);
      }

      return data?.content as string;
    },
    onError: () => {
      nestoToast.error('Kon geen AI-suggestie genereren');
    },
  });
}

export function useReplyToGoogle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { reviewId: string; responseText: string }) => {
      const { data, error } = await supabase.functions.invoke('marketing-reply-review', {
        body: {
          review_id: params.reviewId,
          response_text: params.responseText,
        },
      });

      if (error) throw error;
      return data as { success: boolean; google_reply_posted: boolean; operator_edited: boolean };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-review-stats'] });
      if (data.google_reply_posted) {
        nestoToast.success('Reactie geplaatst op Google');
      } else {
        nestoToast.success('Reactie opgeslagen');
      }
    },
    onError: () => {
      nestoToast.error('Kon reactie niet plaatsen');
    },
  });
}

export function useGoogleBusinessAccount() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  return useQuery({
    queryKey: ['google-business-account', locationId],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_social_accounts')
        .select('id, account_name')
        .eq('location_id', locationId!)
        .eq('platform', 'google_business')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
