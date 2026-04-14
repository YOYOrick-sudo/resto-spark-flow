import { useMemo } from "react";
import { MepOvertijdGroup } from "./MepOvertijdGroup";
import { MepCategoryGroup } from "./MepCategoryGroup";
import { MepCompletedGroup } from "./MepCompletedGroup";
import { EmptyState } from "@/components/polar";
import { ClipboardList } from "lucide-react";
import type { MepTask } from "@/hooks/useMepTasks";
import { isTaskOverdue } from "@/utils/mepPriority";

interface MepCategoryViewProps {
  dayTasks: MepTask[];
  onComplete: (task: MepTask) => void;
  onCancel: (taskId: string) => void;
  isLoading?: boolean;
}

export function MepCategoryView({
  dayTasks,
  onComplete,
  onCancel,
  isLoading,
}: MepCategoryViewProps) {
  const { overtijd, openGrouped, voltooid } = useMemo(() => {
    const overtijd: MepTask[] = [];
    const voltooid: MepTask[] = [];
    const groups: Record<string, MepTask[]> = {};

    for (const t of dayTasks) {
      if (t.status === "completed") {
        voltooid.push(t);
      } else if (t.status === "cancelled") {
        // skip
      } else if (isTaskOverdue(t)) {
        overtijd.push(t);
      } else {
        const key = t.category || "overig";
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      }
    }

    return { overtijd, openGrouped: groups, voltooid };
  }, [dayTasks]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (dayTasks.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Geen taken voor deze dag"
        description="Voeg taken toe via het zoekveld hierboven."
      />
    );
  }

  return (
    <div className="space-y-4">
      <MepOvertijdGroup
        tasks={overtijd}
        onComplete={onComplete}
        onCancel={onCancel}
      />

      {Object.entries(openGrouped).map(([category, tasks]) => (
        <MepCategoryGroup
          key={category}
          category={category}
          tasks={tasks}
          onComplete={onComplete}
          onCancel={onCancel}
        />
      ))}

      <MepCompletedGroup tasks={voltooid} />
    </div>
  );
}
