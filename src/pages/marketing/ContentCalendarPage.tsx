import { useState, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/polar/PageHeader';
import { NestoButton } from '@/components/polar/NestoButton';
import { useMarketingSocialPosts, groupPostsByDay } from '@/hooks/useMarketingSocialPosts';
import { CalendarGrid } from '@/components/marketing/calendar/CalendarGrid';
import { WeekView } from '@/components/marketing/calendar/WeekView';
import { CalendarSidebar } from '@/components/marketing/calendar/CalendarSidebar';
import { DayPanel } from '@/components/marketing/calendar/DayPanel';
import { ContentSeriesManager } from '@/components/marketing/calendar/ContentSeriesManager';
import { cn } from '@/lib/utils';

type ViewMode = 'month' | 'week';

export default function ContentCalendarPage() {
  const navigate = useNavigate();
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
        title="Content Kalender"
        className="border-b-0"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary CTA */}
            <NestoButton
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate('/marketing/social/nieuw')}
            >
              Nieuw bericht
            </NestoButton>

            {/* Series button */}
            <NestoButton
              variant="outline"
              size="sm"
              leftIcon={<Repeat className="h-3.5 w-3.5" />}
              onClick={() => setSeriesOpen(true)}
            >
              Series
            </NestoButton>

            {/* View toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['month', 'week'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-3.5 py-1.5 text-sm font-medium transition-all duration-150',
                    viewMode === mode
                      ? 'bg-card text-foreground shadow-sm'
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
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted/50 transition-colors duration-150"
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <span className="text-base font-semibold min-w-[160px] text-center capitalize">
                {monthLabel}
              </span>
              <button
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted/50 transition-colors duration-150"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => setCurrentMonth(startOfMonth(new Date()))}
                className="ml-1 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors duration-150"
              >
                Vandaag
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
