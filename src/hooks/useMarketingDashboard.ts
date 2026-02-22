import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { subDays, format } from 'date-fns';

export function useMarketingDashboard() {
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;

  const revenueQuery = useQuery({
    queryKey: ['marketing-dashboard-revenue', locationId],
    queryFn: async () => {
      const now = new Date();
      const periodStart = subDays(now, 30).toISOString();
      const prevStart = subDays(now, 60).toISOString();

      const { data: current } = await supabase
        .from('marketing_campaign_analytics')
        .select('revenue_attributed, updated_at')
        .eq('location_id', locationId!);

      const totalRevenue = (current || []).reduce(
        (sum, r) => sum + Number(r.revenue_attributed || 0), 0
      );

      // Daily revenue for sparkline (last 30 days)
      const dailyMap = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        dailyMap.set(format(subDays(now, i), 'yyyy-MM-dd'), 0);
      }
      (current || []).forEach((r) => {
        const day = format(new Date(r.updated_at), 'yyyy-MM-dd');
        if (dailyMap.has(day)) {
          dailyMap.set(day, (dailyMap.get(day) || 0) + Number(r.revenue_attributed || 0));
        }
      });

      const sparklineData = Array.from(dailyMap.entries()).map(([date, value]) => ({
        date,
        value,
      }));

      return { totalRevenue, sparklineData };
    },
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000,
  });

  const guestsReachedQuery = useQuery({
    queryKey: ['marketing-dashboard-guests', locationId],
    queryFn: async () => {
      const periodStart = subDays(new Date(), 30).toISOString();
      const { data, count } = await supabase
        .from('marketing_email_log')
        .select('customer_id', { count: 'exact' })
        .eq('location_id', locationId!)
        .gte('sent_at', periodStart);

      // Approximate unique count (exact requires distinct which isn't supported in count)
      const uniqueIds = new Set((data || []).map((r) => r.customer_id));
      return uniqueIds.size;
    },
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000,
  });

  const atRiskQuery = useQuery({
    queryKey: ['marketing-dashboard-atrisk', locationId],
    queryFn: async () => {
      const threshold = subDays(new Date(), 60).toISOString();
      const { data } = await supabase
        .from('customers')
        .select('id')
        .eq('location_id', locationId!)
        .lt('last_visit_at', threshold)
        .not('last_visit_at', 'is', null);

      return (data || []).length;
    },
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000,
  });

  const activeFlowsQuery = useQuery({
    queryKey: ['marketing-dashboard-flows', locationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('marketing_automation_flows')
        .select('id, name')
        .eq('location_id', locationId!)
        .eq('is_active', true);

      return data || [];
    },
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000,
  });

  const recentCampaignsQuery = useQuery({
    queryKey: ['marketing-dashboard-campaigns', locationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('marketing_campaigns')
        .select('id, name, status, sent_count, sent_at, created_at')
        .eq('location_id', locationId!)
        .order('created_at', { ascending: false })
        .limit(5);

      return data || [];
    },
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000,
  });

  const activityQuery = useQuery({
    queryKey: ['marketing-dashboard-activity', locationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('marketing_email_log')
        .select('id, campaign_id, flow_id, customer_id, sent_at, status')
        .eq('location_id', locationId!)
        .order('sent_at', { ascending: false })
        .limit(10);

      return data || [];
    },
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    revenue: revenueQuery,
    guestsReached: guestsReachedQuery,
    atRisk: atRiskQuery,
    activeFlows: activeFlowsQuery,
    recentCampaigns: recentCampaignsQuery,
    activity: activityQuery,
    isLoading:
      revenueQuery.isLoading ||
      guestsReachedQuery.isLoading ||
      atRiskQuery.isLoading ||
      activeFlowsQuery.isLoading,
  };
}
