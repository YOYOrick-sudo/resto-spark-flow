import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MepTaskRow } from "./MepTaskRow";
import type { MepTask } from "@/hooks/useMepTasks";

interface MepOvertijdGroupProps {
  tasks: MepTask[];
  onComplete: (task: MepTask) => void;
  onCancel: (taskId: string) => void;
  onPriorityChange?: (taskId: string, prioriteit: string) => void;
}

export function MepOvertijdGroup({ tasks, onComplete, onCancel, onPriorityChange }: MepOvertijdGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <div className="border border-destructive/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setCollapsed((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[48px] bg-destructive/10"
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-destructive" />
          ) : (
            <ChevronDown className="h-4 w-4 text-destructive" />
          )}
          <span className="font-semibold text-sm text-destructive uppercase tracking-wide">
            Overtijd ({tasks.length})
          </span>
        </div>
      </button>

      {!collapsed && (
        <div className="divide-y divide-border">
          {tasks.map((task) => (
            <MepTaskRow
              key={task.id}
              task={task}
              isOverdue
              onComplete={onComplete}
              onCancel={onCancel}
              onPriorityChange={onPriorityChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
