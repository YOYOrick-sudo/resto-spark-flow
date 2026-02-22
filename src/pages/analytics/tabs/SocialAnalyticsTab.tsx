import { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Eye, Users, FileText, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoOutlineButtonGroup } from '@/components/polar/NestoOutlineButtonGroup';
import { StatCard } from '@/components/polar/StatCard';
import { InfoAlert } from '@/components/polar/InfoAlert';
import { EmptyState } from '@/components/polar/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useSocialAnalytics } from '@/hooks/useSocialAnalytics';
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

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  facebook: '#1877F2',
  google_business: '#34A853',
};

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

  const chartData = socialMetrics.data ?? [];
  const posts = postPerformance.data ?? [];

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
    </div>
  );
}
