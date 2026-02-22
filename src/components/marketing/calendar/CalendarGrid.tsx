import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
} from 'date-fns';
import { DayCell } from './DayCell';
import { getHolidayForDate } from '@/lib/dutchHolidays';
import type { SocialPost } from '@/hooks/useMarketingSocialPosts';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useUpdateSocialPost } from '@/hooks/useMarketingSocialPosts';

const DAY_HEADERS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

interface CalendarGridProps {
  month: Date;
  postsByDay: Record<string, SocialPost[]>;
  onDayClick: (date: Date) => void;
}

export function CalendarGrid({ month, postsByDay, onDayClick }: CalendarGridProps) {
  const updatePost = useUpdateSocialPost();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const postId = String(active.id);
    const targetDateStr = String(over.id);

    // Find original post to preserve time
    const allPosts = Object.values(postsByDay).flat();
    const post = allPosts.find((p) => p.id === postId);
    if (!post?.scheduled_at) return;

    const originalDate = new Date(post.scheduled_at);
    const [year, monthNum, day] = targetDateStr.split('-').map(Number);
    const newDate = new Date(year, monthNum - 1, day, originalDate.getHours(), originalDate.getMinutes());

    updatePost.mutate({ id: postId, scheduled_at: newDate.toISOString() });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col bg-card border border-border shadow-card rounded-card overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center py-2.5">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 flex-1">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            return (
              <DayCell
                key={key}
                date={day}
                dateKey={key}
                posts={postsByDay[key] ?? []}
                holiday={getHolidayForDate(day)}
                isCurrentMonth={isSameMonth(day, month)}
                isToday={isToday(day)}
                onClick={() => onDayClick(day)}
              />
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}
