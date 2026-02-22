import { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Info } from 'lucide-react';
import { PageHeader } from '@/components/polar/PageHeader';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoOutlineButtonGroup } from '@/components/polar/NestoOutlineButtonGroup';
import { NestoTable, type Column } from '@/components/polar/NestoTable';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { EmptyState } from '@/components/polar/EmptyState';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketingAnalytics } from '@/hooks/useMarketingAnalytics';
import { cn } from '@/lib/utils';

const AVG_REVENUE_PER_GUEST = 35;

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
          <span className="capitalize">{p.dataKey === 'delivered' ? 'Verzonden' : p.dataKey === 'opened' ? 'Geopend' : 'Geklikt'}</span>
          : {p.value}
        </p>
      ))}
    </div>
  );
};

export default function MarketingAnalytics() {
  const [period, setPeriod] = useState('30');
  const periodDays = parseInt(period, 10);
  const { emailMetrics, revenue, campaignTable, isLoading } = useMarketingAnalytics(periodDays);

  const emailData = emailMetrics.data ?? [];
  const revenueTotal = revenue.data ?? 0;
  const campaigns = campaignTable.data ?? [];

  const campaignColumns: Column<any>[] = [
    { key: 'name', header: 'Naam', render: (item) => <span className="font-medium">{item.name}</span> },
    { key: 'sent_count', header: 'Verzonden', className: 'tabular-nums text-right', headerClassName: 'text-right' },
    { key: 'delivered_count', header: 'Bezorgd', className: 'tabular-nums text-right', headerClassName: 'text-right' },
    {
      key: 'opened_count',
      header: 'Opens',
      className: 'tabular-nums text-right',
      headerClassName: 'text-right',
      render: (item) => {
        const pct = item.sent_count > 0 ? Math.round((item.opened_count / item.sent_count) * 100) : 0;
        return <span>{item.opened_count} <span className="text-muted-foreground">({pct}%)</span></span>;
      },
    },
    {
      key: 'clicked_count',
      header: 'Clicks',
      className: 'tabular-nums text-right',
      headerClassName: 'text-right',
      render: (item) => {
        const pct = item.sent_count > 0 ? Math.round((item.clicked_count / item.sent_count) * 100) : 0;
        return <span>{item.clicked_count} <span className="text-muted-foreground">({pct}%)</span></span>;
      },
    },
    {
      key: 'revenue_attributed',
      header: 'Omzet',
      className: 'tabular-nums text-right',
      headerClassName: 'text-right',
      render: (item) => (
        <span>€{item.revenue_attributed.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}</span>
      ),
    },
  ];

  // Sort campaigns client-side by revenue
  const sortedCampaigns = [...campaigns].sort((a, b) => b.revenue_attributed - a.revenue_attributed);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        subtitle="Email en campagne prestaties"
        actions={
          <NestoOutlineButtonGroup options={periodOptions} value={period} onChange={setPeriod} size="sm" />
        }
      />

      {/* Revenue hero */}
      <NestoCard className="!p-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Totale marketing omzet</span>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px]">
              <p className="text-xs">Geschatte omzet op basis van €{AVG_REVENUE_PER_GUEST} per gast. Werkelijke bestedingen kunnen afwijken.</p>
            </TooltipContent>
          </UITooltip>
        </div>
        {isLoading ? (
          <Skeleton className="h-12 w-40 mt-2" />
        ) : (
          <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums block mt-1">
            €{revenueTotal.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
          </span>
        )}
      </NestoCard>

      {/* Email metrics chart */}
      <div className="space-y-3">
        <h2 className="text-h2 text-foreground">Email metrics</h2>
        {emailMetrics.isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-2xl" />
        ) : emailData.length === 0 ? (
          <EmptyState title="Nog geen email data" description="Verzend je eerste campagne om metrics te zien." size="sm" />
        ) : (
          <NestoCard className="overflow-hidden !p-0">
            <div className="p-6 pb-0">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Verzonden
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Geopend
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-pending" />
                  Geklikt
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={emailData} margin={{ top: 20, right: 24, bottom: 20, left: 24 }}>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  interval="preserveStartEnd"
                />
                <YAxis hide />
                <Tooltip content={chartTooltip} cursor={false} />
                <Line type="monotone" dataKey="delivered" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="opened" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clicked" stroke="hsl(var(--pending))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </NestoCard>
        )}
      </div>

      {/* Campaign performance table */}
      <div className="space-y-3">
        <h2 className="text-h2 text-foreground">Campagne prestaties</h2>
        {campaignTable.isLoading ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : sortedCampaigns.length === 0 ? (
          <EmptyState title="Nog geen campagnes verzonden" description="Verzonden campagnes verschijnen hier met hun prestaties." size="sm" />
        ) : (
          <NestoTable
            columns={campaignColumns}
            data={sortedCampaigns}
            keyExtractor={(item) => item.id}
          />
        )}
      </div>
    </div>
  );
}
