import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MepTaskRow } from "./MepTaskRow";
import type { MepTask } from "@/hooks/useMepTasks";

interface MepCompletedGroupProps {
  tasks: MepTask[];
}

export function MepCompletedGroup({ tasks }: MepCompletedGroupProps) {
  const [collapsed, setCollapsed] = useState(true);

  if (tasks.length === 0) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setCollapsed((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[48px] bg-muted/30"
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-sm text-muted-foreground">
            Voltooid vandaag ({tasks.length})
          </span>
        </div>
      </button>

      {!collapsed && (
        <div className="divide-y divide-border">
          {tasks.map((task) => (
            <MepTaskRow
              key={task.id}
              task={task}
              onComplete={() => {}}
              onCancel={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
