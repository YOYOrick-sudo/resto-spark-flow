import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Eye, Users, FileText, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoOutlineButtonGroup } from '@/components/polar/NestoOutlineButtonGroup';
import { StatCard } from '@/components/polar/StatCard';
import { InfoAlert } from '@/components/polar/InfoAlert';
import { EmptyState } from '@/components/polar/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSocialAnalytics } from '@/hooks/useSocialAnalytics';
import { useBrandIntelligence } from '@/hooks/useBrandIntelligence';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  google_business: 'Google',
};

import { PLATFORM_COLORS } from '@/lib/platformColors';

const periodOptions = [
  { value: '7', label: '7 dagen' },
  { value: '30', label: '30 dagen' },
  { value: '90', label: '90 dagen' },
];

const chartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-lg space-y-0.5">
      <p className="font-medium">{payload[0]?.payload?.label || label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey}>
          <span>{p.name}</span>: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function SocialAnalyticsTab() {
  const [period, setPeriod] = useState('30');
  const periodDays = parseInt(period, 10);
  const { socialMetrics, postPerformance, heroMetrics, bestPostTimeText, isLoading } = useSocialAnalytics(periodDays);
  const { data: intelligence, isLoading: biLoading } = useBrandIntelligence();

  const chartData = socialMetrics.data ?? [];
  const posts = postPerformance.data ?? [];

  // Parse content type performance from brand intelligence
  const contentTypePerf = (() => {
    const raw = intelligence?.content_type_performance;
    if (!raw || typeof raw !== 'object') return [];
    return Object.entries(raw as Record<string, any>)
      .map(([name, val]) => ({
        name: name.replace(/_/g, ' '),
        avg_engagement: (val as any)?.avg_engagement ?? 0,
        post_count: (val as any)?.post_count ?? 0,
      }))
      .sort((a, b) => b.avg_engagement - a.avg_engagement);
  })();

  // Parse top hashtags from brand intelligence
  const topHashtags = (() => {
    const raw = intelligence?.top_hashtag_sets;
    if (!raw || !Array.isArray(raw)) return [];
    return (raw as any[])
      .slice(0, 15)
      .sort((a, b) => (b.avg_engagement ?? 0) - (a.avg_engagement ?? 0));
  })();

  return (
    <div className="space-y-8">
      {/* Period selector */}
      <div className="flex justify-end">
        <NestoOutlineButtonGroup options={periodOptions} value={period} onChange={setPeriod} size="sm" />
      </div>

      {/* Hero metrics */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Totaal bereik" value={heroMetrics.totalReach.toLocaleString('nl-NL')} icon={Eye} />
          <StatCard label="Totaal engagement" value={heroMetrics.totalEngagement.toLocaleString('nl-NL')} icon={Users} />
          <StatCard label="Gepubliceerde posts" value={heroMetrics.publishedCount} icon={FileText} />
          <StatCard label="Gem. engagement rate" value={`${heroMetrics.avgEngagementRate}%`} icon={TrendingUp} />
        </div>
      )}

      {/* Per-platform reach chart */}
      <div className="space-y-3">
        <h2 className="text-h2 text-foreground">Bereik per platform</h2>
        {socialMetrics.isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-2xl" />
        ) : chartData.length === 0 ? (
          <EmptyState title="Nog geen social data" description="Publiceer je eerste post om metrics te zien." size="sm" />
        ) : (
          <NestoCard className="overflow-hidden !p-0">
            <div className="p-6 pb-0">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#E1306C' }} />
                  Instagram
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#1877F2' }} />
                  Facebook
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#34A853' }} />
                  Google
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 20, right: 24, bottom: 20, left: 24 }}>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  interval="preserveStartEnd"
                />
                <YAxis hide />
                <Tooltip content={chartTooltip} cursor={false} />
                <Line type="monotone" dataKey="instagram_reach" name="Instagram" stroke="#E1306C" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="facebook_reach" name="Facebook" stroke="#1877F2" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="google_reach" name="Google" stroke="#34A853" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </NestoCard>
        )}
      </div>

      {/* Best post time */}
      <InfoAlert variant="info" title="Optimale posttijd" description={bestPostTimeText} />

      {/* Post performance table */}
      <div className="space-y-3">
        <h2 className="text-h2 text-foreground">Post prestaties</h2>
        {postPerformance.isLoading ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : posts.length === 0 ? (
          <EmptyState title="Publiceer je eerste post om prestaties te zien." size="sm" />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Platform</TableHead>
                  <TableHead>Bericht</TableHead>
                  <TableHead className="w-[100px] text-right">Bereik</TableHead>
                  <TableHead className="w-[100px] text-right">Engagement</TableHead>
                  <TableHead className="w-[120px]">Datum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.slice(0, 20).map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PLATFORM_COLORS[post.platform] ?? '#888' }}
                        />
                        <span className="text-sm">{PLATFORM_LABELS[post.platform] ?? post.platform}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm truncate block max-w-[250px]">
                        {post.content_text || '(geen tekst)'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {post.reach.toLocaleString('nl-NL')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {post.engagement.toLocaleString('nl-NL')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(post.published_at), 'd MMM yyyy', { locale: nl })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Content Type Performance */}
      <div className="space-y-3">
        <h2 className="text-h2 text-foreground">Content Prestaties per Type</h2>
        {biLoading ? (
          <Skeleton className="h-[250px] w-full rounded-2xl" />
        ) : contentTypePerf.length === 0 ? (
          <EmptyState title="Publiceer meer posts om prestaties per type te zien." size="sm" />
        ) : (
          <NestoCard className="overflow-hidden !p-0">
            <ResponsiveContainer width="100%" height={Math.max(200, contentTypePerf.length * 50)}>
              <BarChart data={contentTypePerf} layout="vertical" margin={{ top: 20, right: 40, bottom: 20, left: 120 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                  width={110}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-lg space-y-0.5">
                        <p className="font-medium capitalize">{d.name}</p>
                        <p>Gem. engagement: {d.avg_engagement}</p>
                        <p>Posts: {d.post_count}</p>
                      </div>
                    );
                  }}
                  cursor={false}
                />
                <Bar dataKey="avg_engagement" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </NestoCard>
        )}
      </div>

      {/* Top Hashtags */}
      <div className="space-y-3">
        <h2 className="text-h2 text-foreground">Top Hashtags</h2>
        {biLoading ? (
          <Skeleton className="h-20 w-full rounded-2xl" />
        ) : topHashtags.length === 0 ? (
          <EmptyState title="Nog geen hashtag data beschikbaar." size="sm" />
        ) : (
          <NestoCard>
            <div className="flex flex-wrap gap-2">
              {topHashtags.map((tag: any, idx: number) => (
                <UITooltip key={idx}>
                  <TooltipTrigger asChild>
                    <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm cursor-default">
                      #{tag.tag || tag.hashtag || tag.name || tag}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Gem. engagement: {tag.avg_engagement ?? '—'}</p>
                  </TooltipContent>
                </UITooltip>
              ))}
            </div>
          </NestoCard>
        )}
      </div>
    </div>
  );
}
