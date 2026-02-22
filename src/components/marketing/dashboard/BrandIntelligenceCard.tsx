import { Brain, Clock } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { InfoAlert } from '@/components/polar/InfoAlert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const STAGES = [
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'learning', label: 'Learning' },
  { key: 'optimizing', label: 'Optimizing' },
  { key: 'mature', label: 'Mature' },
] as const;

function stageIndex(stage: string): number {
  const idx = STAGES.findIndex((s) => s.key === stage);
  return idx >= 0 ? idx : 0;
}

interface BrandIntelligenceCardProps {
  data: {
    learning_stage: string;
    posts_analyzed: number;
    weekly_best_content_type: string | null;
    optimal_post_times: any;
    engagement_baseline: any;
  } | null | undefined;
  isLoading: boolean;
}

function formatPostTimes(times: any): string {
  if (!times || !Array.isArray(times)) return '—';
  const DAY_SHORT: Record<string, string> = {
    monday: 'Ma', tuesday: 'Di', wednesday: 'Wo', thursday: 'Do',
    friday: 'Vr', saturday: 'Za', sunday: 'Zo',
    mon: 'Ma', tue: 'Di', wed: 'Wo', thu: 'Do', fri: 'Vr', sat: 'Za', sun: 'Zo',
  };
  return times
    .slice(0, 3)
    .map((t: any) => {
      if (typeof t === 'string') return t;
      const day = DAY_SHORT[(t.day || '').toLowerCase()] || t.day || '';
      const time = t.time || t.hour || '';
      return `${day} ${time}`.trim();
    })
    .join(', ') || '—';
}

export function BrandIntelligenceCard({ data, isLoading }: BrandIntelligenceCardProps) {
  if (isLoading) {
    return (
      <NestoCard>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">AI Intelligentie</span>
        </div>
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-20 w-full" />
      </NestoCard>
    );
  }

  if (!data) return null;

  const currentIdx = stageIndex(data.learning_stage);
  const baseline = (data.engagement_baseline && typeof data.engagement_baseline === 'object') ? data.engagement_baseline as Record<string, any> : null;
  const googleRating = baseline?.google_rating;
  const googleCount = baseline?.google_review_count;

  return (
    <NestoCard>
      <div className="flex items-center gap-2 mb-5">
        <Brain className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">AI Intelligentie</span>
      </div>

      {/* Learning stage progress */}
      <div className="flex items-center gap-0 mb-5">
        {STAGES.map((stage, idx) => (
          <div key={stage.key} className="flex items-center flex-1 last:flex-initial">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'h-3 w-3 rounded-full border-2 transition-colors',
                  idx <= currentIdx
                    ? 'bg-primary border-primary'
                    : 'bg-transparent border-muted-foreground/30'
                )}
              />
              <span className={cn(
                'text-[10px] sm:text-xs whitespace-nowrap',
                idx <= currentIdx ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}>
                {stage.label}
              </span>
            </div>
            {idx < STAGES.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-1 mt-[-18px]',
                  idx < currentIdx ? 'bg-primary' : 'bg-muted-foreground/20'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Content based on stage */}
      {data.learning_stage === 'onboarding' ? (
        <InfoAlert
          variant="info"
          title="Post meer content om de AI te trainen"
          description="Na 5 posts leert de AI je stijl."
        />
      ) : (
        <div className="space-y-2.5">
          <p className="text-sm text-muted-foreground">
            Posts geanalyseerd: <span className="tabular-nums">{data.posts_analyzed}</span>
          </p>

          {data.weekly_best_content_type && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Sterkste content type:</span>
              <NestoBadge variant="primary">{data.weekly_best_content_type}</NestoBadge>
            </div>
          )}

          <div className="flex items-start gap-2 text-sm">
            <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-muted-foreground">
              Optimale posttijden: <span className="text-foreground">{formatPostTimes(data.optimal_post_times)}</span>
            </span>
          </div>

          {googleRating != null && (
            <p className="text-sm text-muted-foreground">
              Google score: <span className="text-foreground font-medium">{googleRating}/5</span>
              {googleCount != null && <span> ({googleCount} reviews)</span>}
            </p>
          )}
        </div>
      )}
    </NestoCard>
  );
}
