import { useState } from "react";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MepTaskRow } from "./MepTaskRow";
import { cn } from "@/lib/utils";
import type { MepTask } from "@/hooks/useMepTasks";

const CATEGORY_LABELS: Record<string, string> = {
  halffabricaat: "Halffabricaten",
  mise_en_place: "Mise en place",
  schoonmaak: "Schoonmaak",
  overig: "Overig",
};

interface MepCategoryGroupProps {
  category: string;
  tasks: MepTask[];
  onComplete: (task: MepTask) => void;
  onCancel: (taskId: string) => void;
  defaultCollapsed?: boolean;
}

export function MepCategoryGroup({
  category,
  tasks,
  onComplete,
  onCancel,
  defaultCollapsed = false,
}: MepCategoryGroupProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const completedCount = tasks.filter(
    (t) => t.status === "completed"
  ).length;
  const total = tasks.length;
  const allDone = completedCount === total;

  // Sort by deadline (earliest first), nulls last
  const sorted = [...tasks].sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return a.deadline.localeCompare(b.deadline);
  });

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setCollapsed((p) => !p)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 min-h-[48px] transition-colors",
          allDone ? "bg-green-50 dark:bg-green-950/30" : "bg-rose-50 dark:bg-rose-950/30"
        )}
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          <span className="font-medium text-sm">
            {CATEGORY_LABELS[category] || category}
          </span>
        </div>
        <NestoBadge
          variant={allDone ? "success" : "pending"}
          size="sm"
        >
          {completedCount}/{total}
        </NestoBadge>
      </button>

      {!collapsed && (
        <div className="divide-y divide-border">
          {sorted.map((task) => (
            <MepTaskRow
              key={task.id}
              task={task}
              onComplete={onComplete}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
