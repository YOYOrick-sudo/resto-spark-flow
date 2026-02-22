import { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Info, Euro, Users, TrendingUp } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoOutlineButtonGroup } from '@/components/polar/NestoOutlineButtonGroup';
import { NestoTable, type Column } from '@/components/polar/NestoTable';
import { StatCard } from '@/components/polar/StatCard';
import { EmptyState } from '@/components/polar/EmptyState';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketingAnalytics } from '@/hooks/useMarketingAnalytics';

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

export default function MarketingAnalyticsTab() {
  const [period, setPeriod] = useState('30');
  const periodDays = parseInt(period, 10);
  const { emailMetrics, revenue, campaignTable, revenueWeekly, activeContacts, campaignDetail, isLoading } = useMarketingAnalytics(periodDays);

  const emailData = emailMetrics.data ?? [];
  const revenueTotal = revenue.data ?? 0;
  const campaigns = campaignTable.data ?? [];
  const weeklyData = revenueWeekly.data ?? [];
  const contactCount = activeContacts.data ?? 0;
  const detailCampaigns = campaignDetail.data ?? [];
  const avgRevenue = campaigns.length > 0 ? Math.round(revenueTotal / campaigns.length) : 0;

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

  const sortedCampaigns = [...campaigns].sort((a, b) => b.revenue_attributed - a.revenue_attributed);

  return (
    <div className="space-y-8">
      {/* Period selector */}
      <div className="flex justify-end">
        <NestoOutlineButtonGroup options={periodOptions} value={period} onChange={setPeriod} size="sm" />
      </div>

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

      {/* Revenue Impact */}
      <div className="space-y-3">
        <h2 className="text-h2 text-foreground">Revenue Impact</h2>
        {revenueWeekly.isLoading ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : revenueTotal === 0 ? (
          <EmptyState title="Verstuur je eerste campagne om revenue impact te meten." size="sm" />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Marketing revenue" value={`€${revenueTotal.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`} icon={Euro} />
              <StatCard label="Revenue per campagne" value={`€${avgRevenue.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`} icon={TrendingUp} />
              <StatCard label="Actieve contacten" value={contactCount} icon={Users} />
            </div>
            {weeklyData.some((w) => w.revenue > 0) && (
              <NestoCard className="overflow-hidden !p-0">
                <div className="p-6 pb-0">
                  <span className="text-xs text-muted-foreground">Revenue per week (laatste 12 weken)</span>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={weeklyData} margin={{ top: 20, right: 24, bottom: 20, left: 24 }}>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
                    <YAxis hide />
                    <Tooltip content={chartTooltip} cursor={false} />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </NestoCard>
            )}
          </>
        )}
      </div>

      {/* Email Performance Detail */}
      <div className="space-y-3">
        <h2 className="text-h2 text-foreground">Email Performance</h2>
        {campaignDetail.isLoading ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : detailCampaigns.length === 0 ? (
          <EmptyState title="Nog geen campagne data beschikbaar" size="sm" />
        ) : (
          <NestoTable
            columns={[
              { key: 'name', header: 'Naam', render: (item) => <span className="font-medium">{item.name}</span> },
              { key: 'sent_count', header: 'Verzonden', className: 'tabular-nums text-right', headerClassName: 'text-right' },
              {
                key: 'opened_count', header: 'Geopend', className: 'tabular-nums text-right', headerClassName: 'text-right',
                render: (item) => {
                  const pct = item.sent_count > 0 ? Math.round((item.opened_count / item.sent_count) * 100) : 0;
                  return <span>{item.opened_count} <span className="text-muted-foreground">({pct}%)</span></span>;
                },
              },
              {
                key: 'clicked_count', header: 'Geklikt', className: 'tabular-nums text-right', headerClassName: 'text-right',
                render: (item) => {
                  const pct = item.sent_count > 0 ? Math.round((item.clicked_count / item.sent_count) * 100) : 0;
                  return <span>{item.clicked_count} <span className="text-muted-foreground">({pct}%)</span></span>;
                },
              },
              {
                key: 'bounced_count', header: 'Bounced', className: 'tabular-nums text-right', headerClassName: 'text-right',
                render: (item) => <span className={item.bounced_count === 0 ? 'text-muted-foreground' : ''}>{item.bounced_count}</span>,
              },
              {
                key: 'revenue_attributed', header: 'Omzet', className: 'tabular-nums text-right', headerClassName: 'text-right',
                render: (item) => <span className={item.revenue_attributed === 0 ? 'text-muted-foreground' : ''}>€{item.revenue_attributed.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}</span>,
              },
            ] as Column<any>[]}
            data={detailCampaigns}
            keyExtractor={(item) => item.id}
          />
        )}
      </div>
    </div>
  );
}
