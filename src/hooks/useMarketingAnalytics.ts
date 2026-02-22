import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { subDays, format, startOfWeek } from 'date-fns';

export function useMarketingAnalytics(periodDays: number) {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const emailMetricsQuery = useQuery({
    queryKey: ['marketing-analytics-email', locationId, periodDays],
    queryFn: async () => {
      const periodStart = subDays(new Date(), periodDays).toISOString();
      const { data } = await supabase
        .from('marketing_email_log')
        .select('sent_at, status, opened_at, clicked_at')
        .eq('location_id', locationId!)
        .gte('sent_at', periodStart);

      // Group by day
      const dayMap = new Map<string, { delivered: number; opened: number; clicked: number }>();
      for (let i = periodDays - 1; i >= 0; i--) {
        const day = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dayMap.set(day, { delivered: 0, opened: 0, clicked: 0 });
      }

      (data || []).forEach((log) => {
        const day = format(new Date(log.sent_at), 'yyyy-MM-dd');
        const entry = dayMap.get(day);
        if (!entry) return;
        if (log.status === 'delivered' || log.status === 'sent') entry.delivered++;
        if (log.opened_at) entry.opened++;
        if (log.clicked_at) entry.clicked++;
      });

      return Array.from(dayMap.entries()).map(([date, metrics]) => ({
        date,
        label: format(new Date(date), 'd MMM'),
        ...metrics,
      }));
    },
    enabled: !!locationId,
  });

  const revenueQuery = useQuery({
    queryKey: ['marketing-analytics-revenue', locationId, periodDays],
    queryFn: async () => {
      const { data: current } = await supabase
        .from('marketing_campaign_analytics')
        .select('revenue_attributed')
        .eq('location_id', locationId!);

      const total = (current || []).reduce(
        (sum, r) => sum + Number(r.revenue_attributed || 0), 0
      );
      return total;
    },
    enabled: !!locationId,
  });

  const campaignTableQuery = useQuery({
    queryKey: ['marketing-analytics-campaigns', locationId, periodDays],
    queryFn: async () => {
      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('id, name, status, sent_count, sent_at')
        .eq('location_id', locationId!)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false });

      if (!campaigns || campaigns.length === 0) return [];

      const campaignIds = campaigns.map((c) => c.id);
      const { data: analytics } = await supabase
        .from('marketing_campaign_analytics')
        .select('campaign_id, sent_count, delivered_count, opened_count, clicked_count, revenue_attributed')
        .eq('location_id', locationId!)
        .in('campaign_id', campaignIds);

      const analyticsMap = new Map(
        (analytics || []).map((a) => [a.campaign_id, a])
      );

      return campaigns.map((c) => {
        const a = analyticsMap.get(c.id);
        return {
          id: c.id,
          name: c.name,
          status: c.status,
          sent_count: a?.sent_count ?? c.sent_count ?? 0,
          delivered_count: a?.delivered_count ?? 0,
          opened_count: a?.opened_count ?? 0,
          clicked_count: a?.clicked_count ?? 0,
          revenue_attributed: Number(a?.revenue_attributed ?? 0),
          sent_at: c.sent_at,
        };
      });
    },
    enabled: !!locationId,
  });

  const revenueWeeklyQuery = useQuery({
    queryKey: ['marketing-analytics-revenue-weekly', locationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('marketing_campaign_analytics')
        .select('revenue_attributed, updated_at')
        .eq('location_id', locationId!);

      // Group by week (last 12 weeks)
      const now = new Date();
      const weekMap = new Map<string, { week: string; label: string; revenue: number }>();
      for (let i = 11; i >= 0; i--) {
        const d = subDays(now, i * 7);
        const ws = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        if (!weekMap.has(ws)) {
          weekMap.set(ws, { week: ws, label: format(new Date(ws), 'd MMM'), revenue: 0 });
        }
      }

      for (const row of data ?? []) {
        const ws = format(startOfWeek(new Date(row.updated_at), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const entry = weekMap.get(ws);
        if (entry) entry.revenue += Number(row.revenue_attributed || 0);
      }

      return Array.from(weekMap.values());
    },
    enabled: !!locationId,
  });

  const activeContactsQuery = useQuery({
    queryKey: ['marketing-analytics-active-contacts', locationId],
    queryFn: async () => {
      const { count } = await supabase
        .from('marketing_contact_preferences')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locationId!)
        .eq('opted_in', true);
      return count ?? 0;
    },
    enabled: !!locationId,
  });

  const campaignDetailQuery = useQuery({
    queryKey: ['marketing-analytics-campaign-detail', locationId],
    queryFn: async () => {
      const cutoff = subDays(new Date(), 90).toISOString();
      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('id, name, sent_at')
        .eq('location_id', locationId!)
        .eq('status', 'sent')
        .gte('sent_at', cutoff)
        .order('sent_at', { ascending: false });

      if (!campaigns?.length) return [];

      const ids = campaigns.map((c) => c.id);
      const { data: analytics } = await supabase
        .from('marketing_campaign_analytics')
        .select('campaign_id, sent_count, delivered_count, opened_count, clicked_count, bounced_count, revenue_attributed')
        .eq('location_id', locationId!)
        .in('campaign_id', ids);

      const aMap = new Map((analytics ?? []).map((a) => [a.campaign_id, a]));

      return campaigns.map((c) => {
        const a = aMap.get(c.id);
        return {
          id: c.id,
          name: c.name,
          sent_at: c.sent_at,
          sent_count: a?.sent_count ?? 0,
          delivered_count: a?.delivered_count ?? 0,
          opened_count: a?.opened_count ?? 0,
          clicked_count: a?.clicked_count ?? 0,
          bounced_count: a?.bounced_count ?? 0,
          revenue_attributed: Number(a?.revenue_attributed ?? 0),
        };
      });
    },
    enabled: !!locationId,
  });

  return {
    emailMetrics: emailMetricsQuery,
    revenue: revenueQuery,
    campaignTable: campaignTableQuery,
    revenueWeekly: revenueWeeklyQuery,
    activeContacts: activeContactsQuery,
    campaignDetail: campaignDetailQuery,
    isLoading: emailMetricsQuery.isLoading || revenueQuery.isLoading || campaignTableQuery.isLoading,
  };
}
