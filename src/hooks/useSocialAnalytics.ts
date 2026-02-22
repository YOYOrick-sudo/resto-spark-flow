import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { subDays, format, getHours, getDay } from 'date-fns';
import { nl } from 'date-fns/locale';

interface DailyPlatformMetrics {
  date: string;
  label: string;
  instagram_reach: number;
  facebook_reach: number;
  google_reach: number;
  instagram_engagement: number;
  facebook_engagement: number;
  google_clicks: number;
}

interface PostPerformance {
  id: string;
  platform: string;
  content_text: string | null;
  impressions: number;
  reach: number;
  engagement: number;
  published_at: string;
}

const DAY_NAMES = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

export function useSocialAnalytics(periodDays: number) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const socialMetricsQuery = useQuery({
    queryKey: ['social-analytics-metrics', locationId, periodDays],
    queryFn: async () => {
      const periodStart = subDays(new Date(), periodDays).toISOString();
      const { data } = await supabase
        .from('marketing_social_posts')
        .select('platform, published_at, analytics')
        .eq('location_id', locationId!)
        .eq('status', 'published')
        .gte('published_at', periodStart);

      // Init day map
      const dayMap = new Map<string, DailyPlatformMetrics>();
      for (let i = periodDays - 1; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const key = format(d, 'yyyy-MM-dd');
        dayMap.set(key, {
          date: key,
          label: format(d, 'd MMM'),
          instagram_reach: 0, facebook_reach: 0, google_reach: 0,
          instagram_engagement: 0, facebook_engagement: 0, google_clicks: 0,
        });
      }

      for (const post of data ?? []) {
        if (!post.published_at) continue;
        const day = format(new Date(post.published_at), 'yyyy-MM-dd');
        const entry = dayMap.get(day);
        if (!entry) continue;

        const a = (post.analytics && typeof post.analytics === 'object' ? post.analytics : {}) as Record<string, number>;

        if (post.platform === 'instagram') {
          entry.instagram_reach += a.reach ?? 0;
          entry.instagram_engagement += a.engagement ?? 0;
        } else if (post.platform === 'facebook') {
          entry.facebook_reach += a.reach ?? a.impressions ?? 0;
          entry.facebook_engagement += a.clicks ?? 0;
        } else if (post.platform === 'google_business') {
          entry.google_reach += a.views ?? 0;
          entry.google_clicks += a.clicks ?? 0;
        }
      }

      return Array.from(dayMap.values());
    },
    enabled: !!locationId,
  });

  const postPerformanceQuery = useQuery({
    queryKey: ['social-analytics-posts', locationId, periodDays],
    queryFn: async () => {
      const periodStart = subDays(new Date(), periodDays).toISOString();
      const { data } = await supabase
        .from('marketing_social_posts')
        .select('id, platform, content_text, analytics, published_at')
        .eq('location_id', locationId!)
        .eq('status', 'published')
        .gte('published_at', periodStart)
        .order('published_at', { ascending: false });

      const posts: PostPerformance[] = (data ?? []).map((p) => {
        const a = (p.analytics && typeof p.analytics === 'object' ? p.analytics : {}) as Record<string, number>;
        return {
          id: p.id,
          platform: p.platform,
          content_text: p.content_text,
          impressions: a.impressions ?? a.views ?? 0,
          reach: a.reach ?? a.views ?? 0,
          engagement: a.engagement ?? a.clicks ?? 0,
          published_at: p.published_at!,
        };
      });

      // Sort by engagement desc
      posts.sort((a, b) => b.engagement - a.engagement);
      return posts;
    },
    enabled: !!locationId,
  });

  // Compute hero metrics
  const metrics = socialMetricsQuery.data ?? [];
  const posts = postPerformanceQuery.data ?? [];

  const totalReach = metrics.reduce((s, d) => s + d.instagram_reach + d.facebook_reach + d.google_reach, 0);
  const totalEngagement = metrics.reduce((s, d) => s + d.instagram_engagement + d.facebook_engagement + d.google_clicks, 0);
  const publishedCount = posts.length;
  const avgEngagementRate = totalReach > 0 ? Math.round((totalEngagement / totalReach) * 1000) / 10 : 0;

  // Best post time analysis
  let bestPostTimeText = 'Post meer om een optimale posttijd te ontdekken';
  if (posts.length >= 5) {
    const top10 = posts.slice(0, 10);
    const hourCounts = new Map<number, number>();
    const dayCounts = new Map<number, number>();

    for (const p of top10) {
      const d = new Date(p.published_at);
      const h = getHours(d);
      const day = getDay(d);
      hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1);
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    }

    let bestHour = 18;
    let bestHourCount = 0;
    for (const [h, c] of hourCounts) {
      if (c > bestHourCount) { bestHour = h; bestHourCount = c; }
    }

    let bestDay = 4; // Thursday
    let bestDayCount = 0;
    for (const [d, c] of dayCounts) {
      if (c > bestDayCount) { bestDay = d; bestDayCount = c; }
    }

    bestPostTimeText = `Op basis van je data: ${DAY_NAMES[bestDay]} om ${String(bestHour).padStart(2, '0')}:00 bereikt de meeste mensen`;
  }

  return {
    socialMetrics: socialMetricsQuery,
    postPerformance: postPerformanceQuery,
    heroMetrics: { totalReach, totalEngagement, publishedCount, avgEngagementRate },
    bestPostTimeText,
    isLoading: socialMetricsQuery.isLoading || postPerformanceQuery.isLoading,
  };
}
