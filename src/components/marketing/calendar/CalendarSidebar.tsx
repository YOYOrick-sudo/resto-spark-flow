import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfWeek, endOfWeek, addWeeks, isWithinInterval, parseISO } from 'date-fns';
import { Instagram, Facebook, Globe, ArrowRight, Lightbulb } from 'lucide-react';
import { InfoAlert } from '@/components/polar/InfoAlert';
import { NestoButton } from '@/components/polar/NestoButton';
import { useBrandIntelligence } from '@/hooks/useBrandIntelligence';
import { useContentIdeas } from '@/hooks/useContentIdeas';
import { useScheduleWeekplan, type WeekplanPost } from '@/hooks/useScheduleWeekplan';
import type { SocialPost } from '@/hooks/useMarketingSocialPosts';

interface CalendarSidebarProps {
  posts: SocialPost[];
  currentMonth: Date;
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

export function CalendarSidebar({ posts, currentMonth }: CalendarSidebarProps) {
  const navigate = useNavigate();
  const { data: intelligence } = useBrandIntelligence();
  const { data: ideas } = useContentIdeas(3);
  const schedule = useScheduleWeekplan();

  const weekplan = intelligence?.current_weekplan as unknown as {
    generated_at: string;
    week_start: string;
    posts: WeekplanPost[];
  } | null;

  const stats = useMemo(() => {
    const now = new Date();
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const nextWeekStart = addWeeks(thisWeekStart, 1);
    const nextWeekEnd = addWeeks(thisWeekEnd, 1);

    let thisWeek = 0;
    let nextWeek = 0;
    let totalScheduled = 0;

    for (const post of posts) {
      if (post.status === 'scheduled' || post.status === 'draft') totalScheduled++;
      if (!post.scheduled_at) continue;
      const d = parseISO(post.scheduled_at);
      if (isWithinInterval(d, { start: thisWeekStart, end: thisWeekEnd })) thisWeek++;
      if (isWithinInterval(d, { start: nextWeekStart, end: nextWeekEnd })) nextWeek++;
    }

    return { thisWeek, nextWeek, totalScheduled };
  }, [posts]);

  return (
    <div className="w-72 shrink-0 bg-card border border-border shadow-card rounded-card p-5 sticky top-6 self-start space-y-0">
      {/* Quick stats */}
      <div>
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick stats
        </h3>
        <div className="space-y-2">
          <StatRow label="Posts deze week" value={stats.thisWeek} />
          <StatRow label="Posts volgende week" value={stats.nextWeek} />
          <StatRow label="Ingepland totaal" value={stats.totalScheduled} />
        </div>
      </div>

      {/* Content ideeën */}
      <div className="border-t border-border/50 pt-4 mt-4">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Content ideeën
        </h3>
        {ideas && ideas.length > 0 ? (
          <div className="space-y-2">
            {ideas.map((idea) => (
              <div key={idea.id} className="flex items-start gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-foreground block truncate">{idea.title}</span>
                  <button
                    onClick={() => navigate(`/marketing/social/nieuw?idea=${idea.id}&content_type=${idea.idea_type}`)}
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5"
                  >
                    Maak post <ArrowRight className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <InfoAlert
            variant="info"
            title="Wordt slim na eerste posts"
            description="AI genereert hier content ideeën op basis van je menukaart en seizoen."
          />
        )}
      </div>

      {/* Weekplan */}
      <div className="border-t border-border/50 pt-4 mt-4">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Weekplan
        </h3>
        {weekplan?.posts?.length ? (
          <div className="space-y-2">
            {weekplan.posts.map((post, i) => {
              const Icon = PLATFORM_ICON[post.platform] ?? Globe;
              const dayShort = DAY_SHORT[post.day?.toLowerCase()] ?? post.day;
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground tabular-nums w-12 shrink-0">
                    {dayShort} {post.time}
                  </span>
                  <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate text-foreground">{post.caption}</span>
                </div>
              );
            })}
            <NestoButton
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => schedule.mutate({ posts: weekplan.posts, status: 'draft' })}
              disabled={schedule.isPending}
            >
              Auto-fill week
            </NestoButton>
          </div>
        ) : (
          <InfoAlert
            variant="info"
            title="Beschikbaar na Instagram koppeling"
            description="Je weekplanning met optimale posttijden."
          />
        )}
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}
