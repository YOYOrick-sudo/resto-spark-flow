import { useMemo } from 'react';
import { startOfWeek, addDays, format, isToday } from 'date-fns';
import { nl } from 'date-fns/locale';
import { NestoCard } from '@/components/polar/NestoCard';
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
              'flex flex-col min-h-0',
              today && 'ring-1 ring-primary rounded-lg'
            )}
          >
            {/* Header */}
            <div
              className="text-center py-2 cursor-pointer hover:bg-accent/30 rounded-t-lg transition-colors"
              onClick={() => onDayClick(day)}
            >
              <div className="text-xs text-muted-foreground uppercase">
                {format(day, 'EEE', { locale: nl })}
              </div>
              <div className="text-sm font-medium">{format(day, 'd')}</div>
              {holiday && (
                <div className="text-[10px] text-primary truncate px-1">{holiday}</div>
              )}
            </div>

            {/* Posts */}
            <div className="flex-1 overflow-y-auto space-y-2 px-1 pb-2">
              {dayPosts.length === 0 && (
                <div className="border border-dashed border-border/50 rounded-lg h-16 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Geen posts</span>
                </div>
              )}
              {dayPosts.map((post) => (
                <NestoCard
                  key={post.id}
                  className="relative pl-3 cursor-pointer hover:shadow-md transition-shadow"
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
                </NestoCard>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
