import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, TrendingUp, AlertTriangle, Zap, Users, Euro, Info } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { PageHeader } from '@/components/polar/PageHeader';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoTable, type Column } from '@/components/polar/NestoTable';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { NestoButton } from '@/components/polar/NestoButton';
import { EmptyState } from '@/components/polar/EmptyState';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useMarketingDashboard } from '@/hooks/useMarketingDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const AVG_REVENUE_PER_GUEST = 35;

const statusBadgeMap: Record<string, { variant: 'success' | 'pending' | 'default' | 'error'; label: string }> = {
  sent: { variant: 'success', label: 'Verzonden' },
  draft: { variant: 'default', label: 'Concept' },
  scheduled: { variant: 'pending', label: 'Ingepland' },
  archived: { variant: 'default', label: 'Gearchiveerd' },
};

const sparklineTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { date, value } = payload[0].payload;
  return (
    <div className="bg-foreground text-background text-xs rounded-lg px-3 py-2 shadow-lg">
      <span className="font-medium">{date}</span>
      <span className="ml-2">€{Math.round(value)}</span>
    </div>
  );
};

export default function MarketingDashboard() {
  const navigate = useNavigate();
  const { revenue, guestsReached, atRisk, activeFlows, recentCampaigns, activity, isLoading } =
    useMarketingDashboard();

  const revenueTotal = revenue.data?.totalRevenue ?? 0;
  const sparklineData = revenue.data?.sparklineData ?? [];
  const hasEnoughSparklineData = sparklineData.filter((d) => d.value > 0).length >= 7;
  const guestsCount = guestsReached.data ?? 0;
  const atRiskCount = atRisk.data ?? 0;
  const flows = activeFlows.data ?? [];

  const campaignColumns: Column<any>[] = [
    { key: 'name', header: 'Naam', render: (item) => <span className="font-medium">{item.name}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        const badge = statusBadgeMap[item.status] ?? { variant: 'default' as const, label: item.status };
        return <NestoBadge variant={badge.variant} dot>{badge.label}</NestoBadge>;
      },
    },
    { key: 'sent_count', header: 'Verzonden', className: 'tabular-nums text-right', headerClassName: 'text-right' },
    {
      key: 'created_at',
      header: 'Datum',
      render: (item) => (
        <span className="text-muted-foreground">
          {formatDistanceToNow(new Date(item.sent_at || item.created_at), { addSuffix: true, locale: nl })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Marketing" subtitle="Overzicht van je marketing prestaties" />

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Marketing omzet */}
        <NestoCard className="overflow-hidden !p-0">
          <div className="px-6 pt-6 flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Euro className="h-3.5 w-3.5" />
              Marketing omzet
            </span>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px]">
                <p className="text-xs">Geschatte omzet op basis van €{AVG_REVENUE_PER_GUEST} per gast. Werkelijke bestedingen kunnen afwijken.</p>
              </TooltipContent>
            </UITooltip>
          </div>
          <div className="px-6 mt-1">
            {isLoading ? (
              <Skeleton className="h-10 w-32" />
            ) : (
              <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums">
                €{revenueTotal.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
              </span>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">laatste 30 dagen</p>
          </div>
          <div className="mt-3">
            {hasEnoughSparklineData ? (
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={sparklineData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <Tooltip content={sparklineTooltip} cursor={false} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[80px]" />
            )}
          </div>
        </NestoCard>

        {/* 2. Gasten bereikt */}
        <NestoCard className="!p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Gasten bereikt
            </span>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <Skeleton className="h-10 w-20" />
            ) : (
              <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums">{guestsCount}</span>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">unieke ontvangers deze maand</p>
          </div>
        </NestoCard>

        {/* 3. At-risk gasten */}
        <NestoCard className="!p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              At-risk gasten
            </span>
          </div>
          <div className="mt-3">
            {isLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              <span
                className={cn(
                  'text-4xl font-bold tracking-tight tabular-nums',
                  atRiskCount > 10 ? 'text-error' : 'text-foreground'
                )}
              >
                {atRiskCount}
              </span>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">&gt;60 dagen niet bezocht</p>
          </div>
          {atRiskCount > 0 && (
            <NestoButton
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate('/marketing/campagnes/nieuw?segment=at-risk')}
            >
              Win-back sturen
            </NestoButton>
          )}
        </NestoCard>

        {/* 4. Actieve flows */}
        <NestoCard
          className="!p-6 cursor-pointer group"
          onClick={() => navigate('/instellingen/marketing')}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Actieve flows
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
          <div className="mt-3">
            {isLoading ? (
              <Skeleton className="h-10 w-12" />
            ) : (
              <span className="text-4xl font-bold tracking-tight text-foreground tabular-nums">{flows.length}</span>
            )}
            {flows.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {flows.slice(0, 3).map((f) => f.name).join(', ')}
                {flows.length > 3 && ` +${flows.length - 3}`}
              </p>
            )}
          </div>
        </NestoCard>
      </div>

      {/* Recent campaigns */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h2 text-foreground">Recente campagnes</h2>
          <NestoButton variant="ghost" size="sm" onClick={() => navigate('/marketing/campagnes')}>
            Alles bekijken
          </NestoButton>
        </div>
        {recentCampaigns.isLoading ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : (recentCampaigns.data ?? []).length === 0 ? (
          <EmptyState
            title="Nog geen campagnes"
            description="Maak je eerste campagne aan om gasten te bereiken."
            size="sm"
          />
        ) : (
          <NestoTable
            columns={campaignColumns}
            data={recentCampaigns.data ?? []}
            keyExtractor={(item) => item.id}
            onRowClick={(item) => navigate(`/marketing/campagnes`)}
          />
        )}
      </div>

      {/* Activity timeline */}
      <div className="space-y-3">
        <h2 className="text-h2 text-foreground">Activiteit</h2>
        {activity.isLoading ? (
          <Skeleton className="h-32 w-full rounded-2xl" />
        ) : (activity.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen marketing activiteit.</p>
        ) : (
          <div className="space-y-1">
            {(activity.data ?? []).map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors duration-150">
                <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                <span className="text-sm text-foreground flex-1 truncate">
                  Email {item.status === 'sent' ? 'verzonden' : item.status} aan gast
                </span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {formatDistanceToNow(new Date(item.sent_at), { addSuffix: true, locale: nl })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
