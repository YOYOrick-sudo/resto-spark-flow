import { useMemo } from 'react';
import { startOfWeek, addDays, format, isToday } from 'date-fns';
import { nl } from 'date-fns/locale';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { getHolidayForDate } from '@/lib/dutchHolidays';
import { cn } from '@/lib/utils';
import type { SocialPost } from '@/hooks/useMarketingSocialPosts';
import { PLATFORM_COLORS } from '@/lib/platformColors';

const STATUS_MAP: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  scheduled: 'warning',
  published: 'success',
  failed: 'error',
};

interface WeekViewProps {
  month: Date;
  postsByDay: Record<string, SocialPost[]>;
  onDayClick: (date: Date) => void;
}

export function WeekView({ month, postsByDay, onDayClick }: WeekViewProps) {
  const weekStart = useMemo(() => startOfWeek(month, { weekStartsOn: 1 }), [month]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  return (
    <div className="grid grid-cols-7 gap-3 h-full">
      {days.map((day) => {
        const key = format(day, 'yyyy-MM-dd');
        const dayPosts = postsByDay[key] ?? [];
        const holiday = getHolidayForDate(day);
        const today = isToday(day);

        return (
          <div
            key={key}
            className={cn(
              'flex flex-col min-h-0 bg-card/50 rounded-xl border border-border/40',
              today && 'border-primary/30'
            )}
          >
            {/* Header */}
            <div
              className="text-center py-2 cursor-pointer hover:bg-accent/30 rounded-t-xl transition-colors duration-150"
              onClick={() => onDayClick(day)}
            >
              <div className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">
                {format(day, 'EEE', { locale: nl })}
              </div>
              <div className="text-sm font-medium">{format(day, 'd')}</div>
              {holiday && (
                <div className="text-[10px] text-primary/80 italic truncate px-1">{holiday}</div>
              )}
            </div>

            {/* Posts */}
            <div className="flex-1 overflow-y-auto space-y-2 px-1.5 pb-2">
              {dayPosts.length === 0 && (
                <div className="h-16 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground/60">Geen posts</span>
                </div>
              )}
              {dayPosts.map((post) => (
                <div
                  key={post.id}
                  className="relative pl-3 bg-secondary/50 rounded-lg border border-border/40 cursor-pointer hover:bg-secondary/80 transition-colors duration-150"
                  onClick={() => onDayClick(day)}
                >
                  {/* Platform color stripe */}
                  <div
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
                    style={{ backgroundColor: PLATFORM_COLORS[post.platform] ?? 'hsl(var(--muted-foreground))' }}
                  />
                  <div className="p-2.5 pl-3">
                    <p className="text-sm truncate">{post.content_text || 'Geen tekst'}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {post.scheduled_at ? format(new Date(post.scheduled_at), 'HH:mm') : '--:--'}
                      </span>
                      <NestoBadge variant={STATUS_MAP[post.status] ?? 'default'}>
                        {post.status}
                      </NestoBadge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
