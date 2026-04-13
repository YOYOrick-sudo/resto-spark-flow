import { ArrowUpRight, Star } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { useReviewAnalytics } from '@/hooks/useReviewAnalytics';

interface Props {
  periodDays: number;
  onClick: () => void;
}

export function ReviewsSummaryCard({ periodDays, onClick }: Props) {
  const { data: stats } = useReviewAnalytics(periodDays);

  const totalReviews = stats?.totalReviews ?? 0;
  const avgSentiment = stats?.avgSentiment ?? null;
  const responseRate = stats?.responseRate ?? null;

  return (
    <NestoCard hoverable className="cursor-pointer group" onClick={onClick}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-warning/10 rounded-lg">
            <Star className="h-4 w-4 text-warning" />
          </div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Reviews</span>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-foreground">
          {totalReviews > 0 ? totalReviews : '—'}
        </span>
        <span className="text-sm text-muted-foreground">reviews</span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
        {avgSentiment !== null && avgSentiment > 0 && (
          <span>Sentiment {avgSentiment.toFixed(1)}/3</span>
        )}
        {responseRate !== null && responseRate > 0 && (
          <>
            <span>·</span>
            <span>{responseRate}% beantwoord</span>
          </>
        )}
      </div>
    </NestoCard>
  );
}
