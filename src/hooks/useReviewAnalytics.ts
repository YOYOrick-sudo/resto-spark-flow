import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { subDays, format, startOfWeek } from 'date-fns';

const SENTIMENT_SCORE: Record<string, number> = { positive: 3, neutral: 2, negative: 1 };

export function useReviewAnalytics(periodDays: number) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const reviewsQuery = useQuery({
    queryKey: ['review-analytics', locationId, periodDays],
    queryFn: async () => {
      const periodStart = subDays(new Date(), periodDays).toISOString();
      const { data } = await supabase
        .from('marketing_reviews')
        .select('id, rating, sentiment, responded_at, published_at')
        .eq('location_id', locationId!)
        .gte('published_at', periodStart)
        .order('published_at', { ascending: true });

      const reviews = data ?? [];

      // Rating distribution
      const ratingDist = [5, 4, 3, 2, 1].map((r) => ({
        rating: r,
        count: reviews.filter((rv) => rv.rating === r).length,
      }));
      const totalReviews = reviews.length;
      const ratingDistWithPct = ratingDist.map((r) => ({
        ...r,
        pct: totalReviews > 0 ? Math.round((r.count / totalReviews) * 100) : 0,
      }));

      // Response rate
      const responded = reviews.filter((r) => r.responded_at != null).length;
      const responseRate = totalReviews > 0 ? Math.round((responded / totalReviews) * 100) : 0;

      // Average sentiment
      const sentimentValues = reviews
        .map((r) => SENTIMENT_SCORE[r.sentiment ?? ''] ?? 0)
        .filter((v) => v > 0);
      const avgSentiment = sentimentValues.length > 0
        ? Math.round((sentimentValues.reduce((a, b) => a + b, 0) / sentimentValues.length) * 10) / 10
        : 0;

      // Sentiment trend by week
      const weekMap = new Map<string, { positive: number; neutral: number; negative: number; label: string }>();
      for (const review of reviews) {
        if (!review.published_at) continue;
        const weekStart = format(startOfWeek(new Date(review.published_at), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        if (!weekMap.has(weekStart)) {
          weekMap.set(weekStart, {
            positive: 0, neutral: 0, negative: 0,
            label: format(new Date(weekStart), 'd MMM'),
          });
        }
        const entry = weekMap.get(weekStart)!;
        const s = review.sentiment ?? 'neutral';
        if (s === 'positive') entry.positive++;
        else if (s === 'negative') entry.negative++;
        else entry.neutral++;
      }
      const sentimentTrend = Array.from(weekMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data }));

      return {
        totalReviews,
        responseRate,
        avgSentiment,
        ratingDistribution: ratingDistWithPct,
        sentimentTrend,
      };
    },
    enabled: !!locationId,
  });

  return reviewsQuery;
}
