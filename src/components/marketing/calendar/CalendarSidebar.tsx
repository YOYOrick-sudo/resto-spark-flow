import { useMemo } from 'react';
import { startOfWeek, endOfWeek, addWeeks, isWithinInterval, parseISO } from 'date-fns';
import { InfoAlert } from '@/components/polar/InfoAlert';
import type { SocialPost } from '@/hooks/useMarketingSocialPosts';

interface CalendarSidebarProps {
  posts: SocialPost[];
  currentMonth: Date;
}

export function CalendarSidebar({ posts, currentMonth }: CalendarSidebarProps) {
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
    <div className="w-72 shrink-0 bg-secondary border border-border rounded-xl p-5 sticky top-6 self-start space-y-0">
      {/* Quick stats */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick stats
        </h3>
        <div className="space-y-2">
          <StatRow label="Posts deze week" value={stats.thisWeek} />
          <StatRow label="Posts volgende week" value={stats.nextWeek} />
          <StatRow label="Ingepland totaal" value={stats.totalScheduled} />
        </div>
      </div>

      {/* Content ideeen */}
      <div className="border-t border-border pt-4 mt-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Content ideeën
        </h3>
        <InfoAlert
          variant="info"
          title="Wordt slim in Sprint 3"
          description="AI genereert hier content ideeën op basis van je menukaart en seizoen."
        />
      </div>

      {/* Weekplan */}
      <div className="border-t border-border pt-4 mt-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Weekplan
        </h3>
        <InfoAlert
          variant="info"
          title="Beschikbaar na Instagram koppeling"
          description="Je weekplanning met optimale posttijden."
        />
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
