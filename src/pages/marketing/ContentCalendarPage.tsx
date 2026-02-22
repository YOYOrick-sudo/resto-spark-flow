import { useState, useMemo } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/polar/PageHeader';
import { useMarketingSocialPosts, groupPostsByDay } from '@/hooks/useMarketingSocialPosts';
import { CalendarGrid } from '@/components/marketing/calendar/CalendarGrid';
import { WeekView } from '@/components/marketing/calendar/WeekView';
import { CalendarSidebar } from '@/components/marketing/calendar/CalendarSidebar';
import { DayPanel } from '@/components/marketing/calendar/DayPanel';
import { ContentSeriesManager } from '@/components/marketing/calendar/ContentSeriesManager';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type ViewMode = 'month' | 'week';

export default function ContentCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [seriesOpen, setSeriesOpen] = useState(false);

  const { data: posts = [], isLoading } = useMarketingSocialPosts(currentMonth);
  const postsByDay = useMemo(() => groupPostsByDay(posts), [posts]);

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: nl });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Kalender"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* More menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted/50 transition-colors">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSeriesOpen(true)}>
                  Series beheren
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* View toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['month', 'week'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium transition-colors',
                    viewMode === mode
                      ? 'bg-primary/10 text-primary border-primary/20 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {mode === 'month' ? 'Maand' : 'Week'}
                </button>
              ))}
            </div>

            {/* Month navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted/50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <span className="text-sm font-medium min-w-[140px] text-center capitalize">
                {monthLabel}
              </span>
              <button
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted/50 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        }
      />

      <div className="flex-1 flex gap-6 p-6 pt-0 min-h-0">
        {/* Calendar grid */}
        <div className="flex-1 min-w-0">
          {viewMode === 'month' ? (
            <CalendarGrid
              month={currentMonth}
              postsByDay={postsByDay}
              onDayClick={setSelectedDate}
            />
          ) : (
            <WeekView
              month={currentMonth}
              postsByDay={postsByDay}
              onDayClick={setSelectedDate}
            />
          )}
        </div>

        {/* Right sidebar — hidden on mobile */}
        <div className="hidden lg:block">
          <CalendarSidebar posts={posts} currentMonth={currentMonth} />
        </div>
      </div>

      {/* Day panel */}
      <DayPanel
        date={selectedDate}
        posts={selectedDate ? (postsByDay[format(selectedDate, 'yyyy-MM-dd')] ?? []) : []}
        onClose={() => setSelectedDate(null)}
      />

      {/* Content Series Manager */}
      <ContentSeriesManager open={seriesOpen} onOpenChange={setSeriesOpen} />
    </div>
  );
}
