import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TaskItem } from './TaskItem';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assigned_role: string | null;
  is_automated: boolean;
  phase_id: string;
  phase: { id: string; name: string; sort_order: number } | null;
}

interface PhaseTaskListProps {
  tasks: Task[];
  currentPhaseId: string | null;
  onCompleteTask: (taskId: string) => void;
  disabled?: boolean;
}

interface PhaseGroup {
  phaseId: string;
  phaseName: string;
  sortOrder: number;
  tasks: Task[];
  completedCount: number;
}

export function PhaseTaskList({ tasks, currentPhaseId, onCompleteTask, disabled }: PhaseTaskListProps) {
  const groups = useMemo(() => {
    const map = new Map<string, PhaseGroup>();
    for (const task of tasks) {
      const pid = task.phase_id;
      if (!map.has(pid)) {
        map.set(pid, {
          phaseId: pid,
          phaseName: task.phase?.name ?? 'Onbekend',
          sortOrder: task.phase?.sort_order ?? 0,
          tasks: [],
          completedCount: 0,
        });
      }
      const g = map.get(pid)!;
      g.tasks.push(task);
      if (task.status === 'completed' || task.status === 'skipped') g.completedCount++;
    }
    return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [tasks]);

  const currentGroup = groups.find((g) => g.phaseId === currentPhaseId);
  const previousGroups = groups
    .filter((g) => g.phaseId !== currentPhaseId && g.sortOrder < (currentGroup?.sortOrder ?? Infinity))
    .sort((a, b) => b.sortOrder - a.sortOrder);

  return (
    <div className="space-y-4">
      {/* Current phase - always open */}
      {currentGroup && (
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">{currentGroup.phaseName}</h4>
          <div className="divide-y divide-border/30">
            {currentGroup.tasks.map((task) => (
              <TaskItem key={task.id} task={task} onComplete={onCompleteTask} disabled={disabled} />
            ))}
          </div>
        </div>
      )}

      {/* Previous phases - collapsed */}
      {previousGroups.map((group) => (
        <Collapsible key={group.phaseId}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full group">
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-90" />
            <span>{group.phaseName}</span>
            <span className="text-xs">({group.completedCount}/{group.tasks.length})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 ml-5">
            <div className="divide-y divide-border/30">
              {group.tasks.map((task) => (
                <TaskItem key={task.id} task={task} onComplete={onCompleteTask} disabled />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
