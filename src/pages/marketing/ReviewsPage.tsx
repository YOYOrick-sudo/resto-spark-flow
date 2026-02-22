import { useState } from 'react';
import { Star, MessageSquare, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { PageHeader } from '@/components/polar/PageHeader';
import { NestoSelect } from '@/components/polar/NestoSelect';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { NestoButton } from '@/components/polar/NestoButton';
import { StatCard } from '@/components/polar/StatCard';
import { EmptyState } from '@/components/polar/EmptyState';
import { NestoTable, type Column } from '@/components/polar/NestoTable';
import { usePermission } from '@/hooks/usePermission';
import { useReviews, useReviewStats, useUpdateReview, useGenerateReviewResponse, type ReviewFilters } from '@/hooks/useReviews';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const SENTIMENT_BADGE: Record<string, { label: string; variant: 'success' | 'default' | 'error' }> = {
  positive: { label: 'Positief', variant: 'success' },
  neutral: { label: 'Neutraal', variant: 'default' },
  negative: { label: 'Negatief', variant: 'error' },
};

const PLATFORM_BADGE: Record<string, { label: string; variant: 'primary' | 'warning' }> = {
  google: { label: 'Google', variant: 'primary' },
  tripadvisor: { label: 'TripAdvisor', variant: 'warning' },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? 'fill-warning text-warning' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-3 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-warning transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right text-muted-foreground">{count}</span>
    </div>
  );
}

export default function ReviewsPage() {
  const canView = usePermission('marketing.view');
  const canManage = usePermission('marketing.manage');
  const [filters, setFilters] = useState<ReviewFilters>({});
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  const { data: reviews, isLoading } = useReviews(filters);
  const { data: stats } = useReviewStats();
  const updateReview = useUpdateReview();
  const generateResponse = useGenerateReviewResponse();

  if (!canView) {
    return (
      <div className="w-full max-w-5xl mx-auto py-12">
        <EmptyState title="Geen toegang" description="Je hebt geen rechten om reviews te bekijken." />
      </div>
    );
  }

  const openReview = (review: any) => {
    setSelectedReview(review);
    setResponseText(review.response_text || review.ai_suggested_response || '');
    setIsFeatured(review.is_featured || false);
  };

  const handleSaveResponse = async () => {
    if (!selectedReview) return;
    await updateReview.mutateAsync({
      id: selectedReview.id,
      response_text: responseText,
      responded_at: responseText ? new Date().toISOString() : undefined,
    });
    toast.success('Antwoord opgeslagen');
    setSelectedReview(null);
  };

  const handleToggleFeatured = async (val: boolean) => {
    if (!selectedReview) return;
    setIsFeatured(val);
    await updateReview.mutateAsync({ id: selectedReview.id, is_featured: val });
    toast.success(val ? 'Review gemarkeerd als featured' : 'Featured verwijderd');
  };

  const handleGenerateAI = async () => {
    if (!selectedReview?.review_text) return;
    const content = await generateResponse.mutateAsync({
      reviewId: selectedReview.id,
      reviewText: selectedReview.review_text,
      authorName: selectedReview.author_name,
      rating: selectedReview.rating,
    });
    if (content) {
      setResponseText(content);
      toast.success('AI-suggestie gegenereerd');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'author_name',
      header: 'Auteur',
      render: (r) => <span className="font-medium text-foreground">{r.author_name || 'Anoniem'}</span>,
    },
    {
      key: 'rating',
      header: 'Score',
      render: (r) => <StarRating rating={r.rating} />,
    },
    {
      key: 'review_text',
      header: 'Review',
      render: (r) => (
        <span className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
          {r.review_text || '—'}
        </span>
      ),
    },
    {
      key: 'published_at',
      header: 'Datum',
      render: (r) => r.published_at
        ? <span className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(r.published_at), { addSuffix: true, locale: nl })}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'sentiment',
      header: 'Sentiment',
      render: (r) => {
        const badge = SENTIMENT_BADGE[r.sentiment] || SENTIMENT_BADGE.neutral;
        return <NestoBadge variant={badge.variant} size="sm">{badge.label}</NestoBadge>;
      },
    },
    {
      key: 'platform',
      header: 'Platform',
      render: (r) => {
        const badge = PLATFORM_BADGE[r.platform] || { label: r.platform, variant: 'default' as const };
        return <NestoBadge variant={badge.variant} size="sm">{badge.label}</NestoBadge>;
      },
    },
    {
      key: 'status',
      header: '',
      render: (r) => r.response_text
        ? <CheckCircle2 className="h-4 w-4 text-success" />
        : <MessageSquare className="h-4 w-4 text-muted-foreground/50" />,
    },
  ];

  const aspectLabels: Record<string, string> = { food: 'Eten', service: 'Service', ambiance: 'Sfeer' };

  return (
    <div className="space-y-6">
      <PageHeader title="Reviews" subtitle="Beheer en beantwoord je reviews" />

      {/* Stats */}
      {stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Google score"
              value={stats.googleRating?.toFixed(1) ?? '—'}
              unit="/5"
              icon={Star}
            />
            <StatCard
              label="Totaal reviews"
              value={stats.googleReviewCount ?? stats.localReviewCount}
              icon={MessageSquare}
            />
            <StatCard
              label="Response rate"
              value={stats.responseRate}
              unit="%"
              icon={CheckCircle2}
            />
            <StatCard
              label="Recente reviews"
              value={stats.localReviewCount}
            />
          </div>

          {/* Rating distribution */}
          <div className="bg-card rounded-xl p-4 border border-border/50 shadow-card max-w-sm">
            <p className="text-caption uppercase text-muted-foreground mb-2">Verdeling</p>
            {[5, 4, 3, 2, 1].map(r => (
              <RatingBar key={r} label={`${r}`} count={stats.ratingDistribution[r - 1]} total={stats.localReviewCount} />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <NestoSelect
          value={filters.platform || ''}
          onValueChange={(v) => setFilters(f => ({ ...f, platform: v || undefined }))}
          options={[
            { value: '', label: 'Alle platforms' },
            { value: 'google', label: 'Google' },
            { value: 'tripadvisor', label: 'TripAdvisor' },
          ]}
          placeholder="Platform"
          className="w-40"
        />
        <NestoSelect
          value={filters.sentiment || ''}
          onValueChange={(v) => setFilters(f => ({ ...f, sentiment: v || undefined }))}
          options={[
            { value: '', label: 'Alle sentiment' },
            { value: 'positive', label: 'Positief' },
            { value: 'neutral', label: 'Neutraal' },
            { value: 'negative', label: 'Negatief' },
          ]}
          placeholder="Sentiment"
          className="w-40"
        />
        <NestoSelect
          value={filters.responded || ''}
          onValueChange={(v) => setFilters(f => ({ ...f, responded: (v as 'all' | 'yes' | 'no') || undefined }))}
          options={[
            { value: '', label: 'Alle' },
            { value: 'yes', label: 'Beantwoord' },
            { value: 'no', label: 'Onbeantwoord' },
          ]}
          placeholder="Status"
          className="w-40"
        />
      </div>

      {/* Table */}
      <NestoTable
        columns={columns}
        data={reviews || []}
        keyExtractor={(r) => r.id}
        onRowClick={openReview}
        emptyMessage="Nog geen reviews gevonden"
      />

      {/* Detail Sheet */}
      <Sheet open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedReview && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedReview.author_name || 'Anoniem'}
                  <StarRating rating={selectedReview.rating} />
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-5 mt-4">
                {/* Platform & date */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {PLATFORM_BADGE[selectedReview.platform] && (
                    <NestoBadge variant={PLATFORM_BADGE[selectedReview.platform].variant} size="sm">
                      {PLATFORM_BADGE[selectedReview.platform].label}
                    </NestoBadge>
                  )}
                  {selectedReview.published_at && (
                    <span>{formatDistanceToNow(new Date(selectedReview.published_at), { addSuffix: true, locale: nl })}</span>
                  )}
                </div>

                {/* Review text */}
                <div className="bg-accent/30 rounded-xl p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedReview.review_text || 'Geen tekst'}
                  </p>
                </div>

                {/* Sentiment aspects */}
                {selectedReview.sentiment_aspects && Object.keys(selectedReview.sentiment_aspects).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedReview.sentiment_aspects as Record<string, string>).map(([aspect, val]) => {
                      const badge = SENTIMENT_BADGE[val] || SENTIMENT_BADGE.neutral;
                      return (
                        <NestoBadge key={aspect} variant={badge.variant} size="sm">
                          {aspectLabels[aspect] || aspect}: {badge.label}
                        </NestoBadge>
                      );
                    })}
                  </div>
                )}

                {/* Featured toggle */}
                {canManage && (
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Featured review</Label>
                    <Switch checked={isFeatured} onCheckedChange={handleToggleFeatured} />
                  </div>
                )}

                {/* AI suggestion */}
                {canManage && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Antwoord</Label>
                      {!selectedReview.ai_suggested_response && (
                        <NestoButton
                          variant="ghost"
                          size="sm"
                          onClick={handleGenerateAI}
                          disabled={generateResponse.isPending}
                        >
                          {generateResponse.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Sparkles className="h-3 w-3 mr-1" />
                          )}
                          AI suggestie
                        </NestoButton>
                      )}
                    </div>
                    <Textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={5}
                      placeholder="Schrijf een antwoord op deze review..."
                    />
                    <NestoButton
                      onClick={handleSaveResponse}
                      disabled={updateReview.isPending || !responseText}
                      className="w-full"
                    >
                      Opslaan
                    </NestoButton>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
