import { useNavigate } from 'react-router-dom';
import { Calendar, Instagram, Facebook, Globe } from 'lucide-react';
import { NestoCard } from '@/components/polar/NestoCard';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { NestoButton } from '@/components/polar/NestoButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useScheduleWeekplan, type WeekplanPost } from '@/hooks/useScheduleWeekplan';

interface WeekplanData {
  generated_at: string;
  week_start: string;
  posts: WeekplanPost[];
}

const PLATFORM_ICON: Record<string, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  google_business: Globe,
};

const DAY_SHORT: Record<string, string> = {
  maandag: 'Ma',
  dinsdag: 'Di',
  woensdag: 'Wo',
  donderdag: 'Do',
  vrijdag: 'Vr',
  zaterdag: 'Za',
  zondag: 'Zo',
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  food_shot: 'Food',
  behind_the_scenes: 'BTS',
  team: 'Team',
  ambiance: 'Sfeer',
  seasonal: 'Seizoen',
  promo: 'Promo',
  event: 'Event',
  user_generated: 'UGC',
};

interface WeekplanCardProps {
  weekplan: WeekplanData | null | undefined;
  isLoading: boolean;
}

export function WeekplanCard({ weekplan, isLoading }: WeekplanCardProps) {
  const navigate = useNavigate();
  const schedule = useScheduleWeekplan();

  if (isLoading) {
    return <Skeleton className="h-48 w-full rounded-card" />;
  }

  if (!weekplan?.posts?.length) return null;

  const weekLabel = weekplan.week_start
    ? `Week van ${new Date(weekplan.week_start + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`
    : '';

  return (
    <NestoCard className="border-primary/20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <h2 className="text-h2 text-foreground">Je weekplan staat klaar</h2>
        </div>
        <span className="text-xs text-muted-foreground">{weekLabel}</span>
      </div>

      <div className="space-y-2">
        {weekplan.posts.map((post, i) => {
          const Icon = PLATFORM_ICON[post.platform] ?? Globe;
          const dayShort = DAY_SHORT[post.day?.toLowerCase()] ?? post.day;

          return (
            <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-accent/30">
              <span className="text-sm font-medium tabular-nums text-muted-foreground w-14 shrink-0">
                {dayShort} {post.time}
              </span>
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm line-clamp-2 flex-1 min-w-0">
                    {post.caption}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px]">
                  <p className="text-xs">📷 {post.photo_suggestion}</p>
                </TooltipContent>
              </Tooltip>
              <NestoBadge variant="default" size="sm" className="shrink-0">
                {CONTENT_TYPE_LABELS[post.content_type] ?? post.content_type}
              </NestoBadge>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mt-4 pt-4 border-t border-border">
        <NestoButton
          size="sm"
          onClick={() => schedule.mutate({ posts: weekplan.posts, status: 'scheduled' })}
          disabled={schedule.isPending}
        >
          ✅ Alles inplannen
        </NestoButton>
        <NestoButton
          variant="outline"
          size="sm"
          onClick={() => {
            schedule.mutate(
              { posts: weekplan.posts, status: 'draft' },
              { onSuccess: () => navigate('/marketing/kalender') }
            );
          }}
          disabled={schedule.isPending}
        >
          ✏️ Aanpassen
        </NestoButton>
      </div>
    </NestoCard>
  );
}
