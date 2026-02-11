import { Checkbox } from '@/components/ui/checkbox';
import { NestoBadge } from '@/components/polar/NestoBadge';
import { AssistentIcon } from '@/components/icons/AssistentIcon';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    assigned_role: string | null;
    is_automated: boolean;
  };
  onToggle: (taskId: string, currentStatus: string) => void;
  disabled?: boolean;
}

export function TaskItem({ task, onToggle, disabled }: TaskItemProps) {
  const isDone = task.status === 'completed' || task.status === 'skipped';
  const isSkipped = task.status === 'skipped';

  return (
    <div className="flex items-start gap-3 py-2">
      <Checkbox
        checked={isDone}
        onCheckedChange={() => {
          if (!isSkipped) onToggle(task.id, task.status);
        }}
        disabled={disabled || isSkipped}
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <NestoBadge variant="primary" size="sm">
                    <AssistentIcon size={14} />
                  </NestoBadge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Wordt afgehandeld door de Nesto Assistent</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
