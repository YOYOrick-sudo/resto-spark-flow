import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Zap, Users, Euro } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { PageHeader } from '@/components/polar/PageHeader';
import { NestoTable, type Column } from '@/components/polar/NestoTable';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { NestoButton } from '@/components/polar/NestoButton';
import { EmptyState } from '@/components/polar/EmptyState';
import { StatCard } from '@/components/polar/StatCard';
import { useMarketingDashboard } from '@/hooks/useMarketingDashboard';
import { useBrandIntelligence } from '@/hooks/useBrandIntelligence';
import { useMarketingOnboardingStatus } from '@/hooks/useMarketingOnboarding';
import { WeekplanCard } from '@/components/marketing/dashboard/WeekplanCard';
import { CoachingTipsCard } from '@/components/marketing/dashboard/CoachingTipsCard';
import { ContentIdeasSection } from '@/components/marketing/dashboard/ContentIdeasSection';
import { BrandIntelligenceCard } from '@/components/marketing/dashboard/BrandIntelligenceCard';
import { MarketingOnboardingWizard } from '@/components/marketing/onboarding/MarketingOnboardingWizard';
import { Skeleton } from '@/components/ui/skeleton';

const statusBadgeMap: Record<string, { variant: 'success' | 'pending' | 'default' | 'error'; label: string }> = {
  sent: { variant: 'success', label: 'Verzonden' },
  draft: { variant: 'default', label: 'Concept' },
  scheduled: { variant: 'pending', label: 'Ingepland' },
  archived: { variant: 'default', label: 'Gearchiveerd' },
};

export default function MarketingDashboard() {
  const navigate = useNavigate();
  const { needsOnboarding, isLoading: onboardingLoading } = useMarketingOnboardingStatus();
  const { revenue, guestsReached, atRisk, activeFlows, recentCampaigns, activity, isLoading } =
    useMarketingDashboard();
  const { data: intelligence, isLoading: intelligenceLoading } = useBrandIntelligence();
  const weekplan = intelligence?.current_weekplan as { generated_at: string; week_start: string; posts: any[] } | null;

  if (onboardingLoading) {
    return <Skeleton className="h-96 w-full rounded-card" />;
  }

  if (needsOnboarding) {
    return <MarketingOnboardingWizard />;
  }

  const revenueTotal = revenue.data?.totalRevenue ?? 0;
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

      {/* Weekplan Card */}
      <WeekplanCard weekplan={weekplan} isLoading={intelligenceLoading} />

      {/* Coaching Tips */}
      <CoachingTipsCard />

      {/* Brand Intelligence */}
      <BrandIntelligenceCard data={intelligence} isLoading={intelligenceLoading} />

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Marketing omzet"
          value={isLoading ? '–' : `€${revenueTotal.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}`}
          icon={Euro}
        />
        <StatCard
          label="Gasten bereikt"
          value={isLoading ? '–' : guestsCount}
          icon={Users}
        />
        <StatCard
          label="At-risk gasten"
          value={isLoading ? '–' : atRiskCount}
          icon={AlertTriangle}
        />
        <StatCard
          label="Actieve flows"
          value={isLoading ? '–' : flows.length}
          icon={Zap}
        />
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
          <div className="overflow-x-auto">
            <NestoTable
              columns={campaignColumns}
              data={recentCampaigns.data ?? []}
              keyExtractor={(item) => item.id}
              onRowClick={(item) => navigate(`/marketing/campagnes`)}
            />
          </div>
        )}
      </div>

      {/* Content Ideas */}
      <ContentIdeasSection bestContentType={intelligence?.weekly_best_content_type} />

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
