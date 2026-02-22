import { Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLATFORM_COLORS } from '@/lib/platformColors';
import type { SocialPost } from '@/hooks/useMarketingSocialPosts';
import { useDroppable, useDraggable } from '@dnd-kit/core';

const MAX_DOTS = 3;

interface DayCellProps {
  date: Date;
  dateKey: string;
  posts: SocialPost[];
  holiday: string | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  onClick: () => void;
}

function DraggableDot({ post }: { post: SocialPost }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: post.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'h-2.5 w-2.5 rounded-full cursor-grab active:cursor-grabbing transition-opacity',
        isDragging && 'opacity-30'
      )}
      style={{ backgroundColor: PLATFORM_COLORS[post.platform] ?? 'hsl(var(--muted-foreground))' }}
      title={`${post.platform}${post.content_text ? ': ' + post.content_text.slice(0, 40) : ''}`}
    />
  );
}

export function DayCell({ date, dateKey, posts, holiday, isCurrentMonth, isToday, onClick }: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });

  const hasRecurring = posts.some((p) => p.is_recurring);
  const visiblePosts = posts.slice(0, MAX_DOTS);
  const overflow = posts.length - MAX_DOTS;

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'border-r border-b border-border/40 p-2 min-h-[90px] cursor-pointer transition-colors duration-150',
        'hover:bg-accent/40',
        isOver && 'bg-accent/50',
        !isCurrentMonth && 'opacity-30'
      )}
    >
      {/* Day number */}
      <div className="mb-0.5">
        {isToday ? (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {date.getDate()}
          </span>
        ) : (
          <span className="text-xs font-medium text-foreground">{date.getDate()}</span>
        )}
      </div>

      {/* Holiday */}
      {holiday && (
        <div className="text-[10px] text-primary/80 italic truncate leading-tight mb-0.5">{holiday}</div>
      )}

      {/* Platform dots */}
      <div className="flex items-center gap-1 flex-wrap">
        {visiblePosts.map((post) => (
          <DraggableDot key={post.id} post={post} />
        ))}
        {hasRecurring && (
          <Repeat className="h-3 w-3 text-muted-foreground" />
        )}
        {overflow > 0 && (
          <span className="text-[10px] text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 leading-none">
            +{overflow}
          </span>
        )}
      </div>
    </div>
  );
}
