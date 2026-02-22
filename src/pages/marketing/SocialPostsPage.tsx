import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Settings, X } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { PageHeader } from '@/components/polar/PageHeader';
import { NestoButton } from '@/components/polar/NestoButton';
import { PLATFORM_COLORS } from '@/lib/platformColors';
import { NestoTabs } from '@/components/polar/NestoTabs';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { EmptyState } from '@/components/polar/EmptyState';
import { InfoAlert } from '@/components/polar/InfoAlert';
import { UGCGrid } from '@/components/marketing/social/UGCGrid';
import { useAllSocialPosts, useABTestResults } from '@/hooks/useAllSocialPosts';
import { useDeleteSocialPost } from '@/hooks/useMarketingSocialPosts';
import { useMarketingSocialAccounts } from '@/hooks/useMarketingSocialAccounts';
import { useBrandIntelligence } from '@/hooks/useBrandIntelligence';
import { useUserContext } from '@/contexts/UserContext';
import { ConfirmDialog } from '@/components/polar/ConfirmDialog';
import { nestoToast } from '@/lib/nestoToast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SocialPost } from '@/hooks/useMarketingSocialPosts';


const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  google_business: 'Google Business',
};

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' }> = {
  draft: { label: 'Concept', variant: 'default' },
  scheduled: { label: 'Ingepland', variant: 'warning' },
  published: { label: 'Gepubliceerd', variant: 'success' },
  failed: { label: 'Mislukt', variant: 'error' },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'Alle statussen' },
  { value: 'draft', label: 'Concept' },
  { value: 'scheduled', label: 'Ingepland' },
  { value: 'published', label: 'Gepubliceerd' },
  { value: 'failed', label: 'Mislukt' },
];

const TABS = [
  { id: 'all', label: 'Alles' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'google_business', label: 'Google' },
  { id: 'ugc', label: 'UGC' },
];

export default function SocialPostsPage() {
  const navigate = useNavigate();
  const { currentLocation } = useUserContext();
  const locationId = currentLocation?.id;
  const [platformTab, setPlatformTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false);
  const [selectedAbTestId, setSelectedAbTestId] = useState<string | null>(null);
  const { accountsWithStatus } = useMarketingSocialAccounts();
  const { data: intelligence } = useBrandIntelligence();

  const onboardingStorageKey = `nesto_ig_onboarded_${locationId}`;
  const showOnboardingCard = useMemo(() => {
    if (dismissedOnboarding) return false;
    if (!intelligence || intelligence.learning_stage === 'onboarding') return false;
    const stored = localStorage.getItem(onboardingStorageKey);
    if (!stored) return false;
    const storedDate = new Date(stored);
    const daysSince = (Date.now() - storedDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince < 7;
  }, [intelligence, dismissedOnboarding, onboardingStorageKey]);

  const filters = {
    platform: platformTab === 'all' ? undefined : platformTab,
    status: statusFilter === 'all' ? undefined : statusFilter,
  };

  const { data: posts = [], isLoading } = useAllSocialPosts(filters);
  const deletePost = useDeleteSocialPost();
  const { data: abTestPosts = [] } = useABTestResults(selectedAbTestId);

  const allDisconnected = accountsWithStatus.every((a) => a.status === 'disconnected');
  const expiringAccounts = accountsWithStatus.filter((a) => a.status === 'expiring');

  const igGridPosts = useMemo(() => {
    if (platformTab !== 'all' && platformTab !== 'instagram') return [];
    const igPosts = (posts ?? [])
      .filter((p) => p.platform === 'instagram' && (p.status === 'published' || p.status === 'scheduled'))
      .sort((a, b) => {
        const dateA = a.scheduled_at || a.published_at || a.created_at;
        const dateB = b.scheduled_at || b.published_at || b.created_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      })
      .slice(0, 9);
    return igPosts;
  }, [posts, platformTab]);

  function handleDelete() {
    if (!deleteId) return;
    deletePost.mutate(deleteId, {
      onSuccess: () => {
        nestoToast.success('Bericht verwijderd');
        setDeleteId(null);
      },
      onError: () => nestoToast.error('Verwijderen mislukt'),
    });
  }

  if (allDisconnected) {
    return (
      <div className="space-y-6">
        <PageHeader title="Social Posts" />
        <EmptyState
          title="Geen social accounts gekoppeld"
          description="Koppel Instagram, Facebook of Google Business in de marketing instellingen."
          action={{ label: 'Naar instellingen', onClick: () => navigate('/instellingen/marketing') }}
        />
      </div>
    );
  }

  // A/B test comparison helpers
  const abVariantA = abTestPosts.filter((p) => p.ab_test_group === 'A');
  const abVariantB = abTestPosts.filter((p) => p.ab_test_group === 'B');
  const abPostsAge = abTestPosts.length > 0
    ? Math.min(...abTestPosts.map((p) => (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60)))
    : 0;
  const abResultsComplete = abPostsAge >= 48;

  function getEngagementRate(post: SocialPost): number {
    const analytics = post.analytics as Record<string, unknown> | null;
    if (!analytics) return 0;
    const reach = Number(analytics.reach ?? 0);
    const engagement = Number(analytics.engagement ?? 0);
    return reach > 0 ? (engagement / reach) * 100 : 0;
  }

  function getWinner(): 'A' | 'B' | null {
    if (!abResultsComplete) return null;
    const avgA = abVariantA.reduce((sum, p) => sum + getEngagementRate(p), 0) / (abVariantA.length || 1);
    const avgB = abVariantB.reduce((sum, p) => sum + getEngagementRate(p), 0) / (abVariantB.length || 1);
    if (avgA === avgB) return null;
    return avgA > avgB ? 'A' : 'B';
  }

  const winner = getWinner();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Posts"
        actions={
          <NestoButton onClick={() => navigate('/marketing/social/nieuw')}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuw bericht
          </NestoButton>
        }
      />

      {showOnboardingCard && (
        <InfoAlert
          variant="success"
          title="Instagram gekoppeld — we kennen nu je stijl en wat het beste werkt."
          description="Je suggesties worden elke week beter."
        >
          <button
            onClick={() => {
              setDismissedOnboarding(true);
              localStorage.removeItem(onboardingStorageKey);
            }}
            className="absolute top-3 right-3 p-1 rounded hover:bg-black/5"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </InfoAlert>
      )}

      {expiringAccounts.map((acc) => (
        <InfoAlert
          key={acc.platform}
          variant="warning"
          title={`${PLATFORM_LABELS[acc.platform] ?? acc.platform} verbinding verloopt binnenkort`}
          description="Ga naar Instellingen om opnieuw te verbinden."
        >
          <NestoButton
            variant="outline"
            size="sm"
            onClick={() => navigate('/instellingen/marketing')}
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Instellingen
          </NestoButton>
        </InfoAlert>
      ))}

      <NestoTabs
        tabs={TABS}
        activeTab={platformTab}
        onTabChange={setPlatformTab}
      />

      <div className="flex items-center gap-3">
        <div className="w-48">
          <NestoSelect
            value={statusFilter}
            onValueChange={setStatusFilter}
            options={STATUS_OPTIONS}
            placeholder="Alle statussen"
          />
        </div>
      </div>

      {/* Instagram Feed Preview */}
      {igGridPosts.length > 0 && (platformTab === 'all' || platformTab === 'instagram') && (
        <div className="space-y-3">
          <h2 className="text-h2 text-foreground">Instagram Feed Preview</h2>
          <div className="grid grid-cols-3 gap-1 max-w-[360px]">
            {igGridPosts.map((post) => {
              const isScheduled = post.status === 'scheduled';
              const hasMedia = post.media_urls && post.media_urls.length > 0;
              const firstWords = (post.content_text ?? '').split(' ').slice(0, 2).join(' ');

              return (
                <div
                  key={post.id}
                  className={`relative aspect-square rounded-sm overflow-hidden group ${
                    isScheduled ? 'border border-dashed border-border opacity-70' : ''
                  }`}
                >
                  {hasMedia ? (
                    <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#E1306C]/20 to-[#E1306C]/5 flex items-center justify-center">
                      <span className="text-[10px] text-muted-foreground text-center px-1 line-clamp-2">
                        {firstWords || '...'}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                    <span className="text-[10px] text-white line-clamp-3">
                      {post.content_text || '(geen tekst)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* UGC Tab */}
      {platformTab === 'ugc' ? (
        <UGCGrid />
      ) : posts.length === 0 && !isLoading ? (
        <EmptyState
          title="Nog geen social posts"
          description="Maak je eerste bericht aan om te starten."
          action={{ label: 'Nieuw bericht', onClick: () => navigate('/marketing/social/nieuw') }}
        />
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Platform</TableHead>
                <TableHead>Bericht</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[160px]">Gepland</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => {
                const status = STATUS_MAP[post.status] ?? STATUS_MAP.draft;
                return (
                  <TableRow
                    key={post.id}
                    className="cursor-pointer hover:bg-accent/30"
                    onClick={() => {
                      if (post.ab_test_id) {
                        setSelectedAbTestId(post.ab_test_id);
                      }
                    }}
                  >
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
                      <span className="text-sm truncate block max-w-[300px]">
                        {post.content_text || '(geen tekst)'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <NestoBadge variant={status.variant}>{status.label}</NestoBadge>
                        {post.ab_test_id && (
                          <NestoBadge variant="primary" size="sm">A/B</NestoBadge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {post.scheduled_at
                          ? format(new Date(post.scheduled_at), 'd MMM HH:mm', { locale: nl })
                          : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(post.id);
                        }}
                        className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Bericht verwijderen?"
        description="Dit bericht wordt permanent verwijderd."
        confirmLabel="Verwijderen"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deletePost.isPending}
      />

      {/* A/B Test Comparison Sheet */}
      <Sheet open={!!selectedAbTestId} onOpenChange={(open) => !open && setSelectedAbTestId(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>A/B Test Vergelijking</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {!abResultsComplete && (
              <InfoAlert
                variant="warning"
                title="Resultaten nog niet compleet"
                description="Wacht minimaal 48 uur na publicatie voor betrouwbare indicaties."
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Variant A */}
              <div className={`space-y-3 p-3 rounded-xl border ${winner === 'A' ? 'border-success bg-success-light/30' : 'border-border'}`}>
                <div className="flex items-center gap-2">
                  <NestoBadge variant="primary" size="sm">Variant A</NestoBadge>
                  {winner === 'A' && <NestoBadge variant="success" size="sm">Winnaar</NestoBadge>}
                </div>
                {abVariantA.map((post) => (
                  <div key={post.id} className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">{PLATFORM_LABELS[post.platform] ?? post.platform}</span>
                    <p className="text-sm line-clamp-3">{post.content_text || '(geen tekst)'}</p>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Bereik: {Number((post.analytics as any)?.reach ?? 0)}</p>
                      <p>Engagement: {Number((post.analytics as any)?.engagement ?? 0)}</p>
                      <p>Rate: {getEngagementRate(post).toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Variant B */}
              <div className={`space-y-3 p-3 rounded-xl border ${winner === 'B' ? 'border-success bg-success-light/30' : 'border-border'}`}>
                <div className="flex items-center gap-2">
                  <NestoBadge variant="primary" size="sm">Variant B</NestoBadge>
                  {winner === 'B' && <NestoBadge variant="success" size="sm">Winnaar</NestoBadge>}
                </div>
                {abVariantB.map((post) => (
                  <div key={post.id} className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">{PLATFORM_LABELS[post.platform] ?? post.platform}</span>
                    <p className="text-sm line-clamp-3">{post.content_text || '(geen tekst)'}</p>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Bereik: {Number((post.analytics as any)?.reach ?? 0)}</p>
                      <p>Engagement: {Number((post.analytics as any)?.engagement ?? 0)}</p>
                      <p>Rate: {getEngagementRate(post).toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs text-muted-foreground text-center cursor-help">
                  Indicatieve vergelijking
                </p>
              </TooltipTrigger>
              <TooltipContent>
                Organische social media posts hebben te weinig volume voor statistische significantie.
              </TooltipContent>
            </Tooltip>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
