import { Checkbox } from '@/components/ui/checkbox';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    assigned_role: string | null;
    is_automated: boolean;
  };
  onComplete: (taskId: string) => void;
  disabled?: boolean;
}

export function TaskItem({ task, onComplete, disabled }: TaskItemProps) {
  const isDone = task.status === 'completed' || task.status === 'skipped';

  return (
    <div className="flex items-start gap-3 py-2">
      <Checkbox
        checked={isDone}
        onCheckedChange={() => {
          if (!isDone) onComplete(task.id);
        }}
        disabled={disabled || isDone}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', isDone && 'line-through text-muted-foreground')}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {task.assigned_role && (
          <NestoBadge variant="outline" size="sm">{task.assigned_role}</NestoBadge>
        )}
        {task.is_automated && (
          <Zap className="h-3.5 w-3.5 text-warning" />
        )}
      </div>
    </div>
  );
}
