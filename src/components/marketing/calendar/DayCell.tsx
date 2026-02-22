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
        'h-2 w-2 rounded-full cursor-grab active:cursor-grabbing transition-opacity',
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
        'border-r border-b border-border p-1.5 min-h-[80px] cursor-pointer transition-colors duration-150',
        'hover:bg-accent/30',
        isOver && 'bg-accent/50',
        isToday && 'ring-1 ring-primary ring-inset rounded-lg',
        !isCurrentMonth && 'opacity-40'
      )}
    >
      {/* Day number */}
      <div className="text-xs font-medium text-foreground mb-0.5">{date.getDate()}</div>

      {/* Holiday */}
      {holiday && (
        <div className="text-[10px] text-primary truncate leading-tight mb-0.5">{holiday}</div>
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
          <span className="text-[10px] text-muted-foreground bg-muted/60 rounded-full px-1.5 py-0.5 leading-none">
            +{overflow}
          </span>
        )}
      </div>
    </div>
  );
}
