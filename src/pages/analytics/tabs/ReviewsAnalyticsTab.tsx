import { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Star, MessageSquare, TrendingUp, BarChart3 } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoOutlineButtonGroup } from '@/components/polar/NestoOutlineButtonGroup';
import { StatCard } from '@/components/polar/StatCard';
import { EmptyState } from '@/components/polar/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useReviewAnalytics } from '@/hooks/useReviewAnalytics';
import { useBrandIntelligence } from '@/hooks/useBrandIntelligence';

const periodOptions = [
  { value: '30', label: '30 dagen' },
  { value: '90', label: '90 dagen' },
  { value: '365', label: '1 jaar' },
];

const chartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-lg space-y-0.5">
      <p className="font-medium">{payload[0]?.payload?.label || label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey}>
          <span className="capitalize">{p.dataKey === 'positive' ? 'Positief' : p.dataKey === 'negative' ? 'Negatief' : 'Neutraal'}</span>
          : {p.value}
        </p>
      ))}
    </div>
  );
};

const RATING_COLORS = ['', 'hsl(var(--error))', 'hsl(var(--warning))', 'hsl(var(--pending))', 'hsl(var(--success))', 'hsl(var(--success))'];

export default function ReviewsAnalyticsTab() {
  const [period, setPeriod] = useState('90');
  const periodDays = parseInt(period, 10);
  const reviewQuery = useReviewAnalytics(periodDays);
  const { data: intelligence, isLoading: biLoading } = useBrandIntelligence();

  const baseline = (intelligence?.engagement_baseline && typeof intelligence.engagement_baseline === 'object')
    ? intelligence.engagement_baseline as Record<string, any> : null;
  const googleRating = baseline?.google_rating ?? '—';
  const googleCount = baseline?.google_review_count ?? '—';

  const data = reviewQuery.data;
  const isLoading = reviewQuery.isLoading || biLoading;

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <NestoOutlineButtonGroup options={periodOptions} value={period} onChange={setPeriod} size="sm" />
      </div>

      {/* Hero stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Google score" value={`${googleRating}/5`} icon={Star} />
          <StatCard label="Totaal reviews" value={googleCount} icon={MessageSquare} />
          <StatCard label="Response rate" value={`${data?.responseRate ?? 0}%`} icon={TrendingUp} />
          <StatCard label="Gem. sentiment" value={data?.avgSentiment ?? '—'} icon={BarChart3} />
        </div>
      )}

      {/* Sentiment trend */}
      <div className="space-y-3">
        <h2 className="text-h2 text-foreground">Sentiment trend</h2>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-2xl" />
        ) : !data?.sentimentTrend.length ? (
          <EmptyState title="Nog geen review data" description="Reviews verschijnen hier zodra ze binnenkomen." size="sm" />
        ) : (
          <NestoCard className="overflow-hidden !p-0">
            <div className="p-6 pb-0">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success" /> Positief
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground" /> Neutraal
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-error" /> Negatief
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.sentimentTrend} margin={{ top: 20, right: 24, bottom: 20, left: 24 }}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
                <YAxis hide />
                <Tooltip content={chartTooltip} cursor={false} />
                <Line type="monotone" dataKey="positive" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="neutral" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="negative" stroke="hsl(var(--error))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </NestoCard>
        )}
      </div>

      {/* Rating distribution */}
      <div className="space-y-3">
        <h2 className="text-h2 text-foreground">Rating verdeling</h2>
        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : !data?.ratingDistribution.some((r) => r.count > 0) ? (
          <EmptyState title="Nog geen ratings" size="sm" />
        ) : (
          <NestoCard>
            <div className="space-y-3">
              {data.ratingDistribution.map((r) => (
                <div key={r.rating} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground w-6 text-right tabular-nums">{r.rating}★</span>
                  <div className="flex-1">
                    <Progress
                      value={r.pct}
                      className="h-2.5 [&>div]:transition-all"
                      style={{ '--progress-color': RATING_COLORS[r.rating] } as any}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground tabular-nums w-16 text-right">
                    {r.count} ({r.pct}%)
                  </span>
                </div>
              ))}
            </div>
          </NestoCard>
        )}
      </div>
    </div>
  );
}
