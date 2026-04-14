import { useMemo } from "react";
import { MepOvertijdGroup } from "./MepOvertijdGroup";
import { MepCompletedGroup } from "./MepCompletedGroup";
import { MepTaskRow } from "./MepTaskRow";
import { EmptyState } from "@/components/polar";
import { ClipboardList } from "lucide-react";
import type { MepTask } from "@/hooks/useMepTasks";
import type { IngredientStockMap } from "@/utils/mepPriority";
import { calculatePriorityScore, getAssistantHint, isTaskOverdue } from "@/utils/mepPriority";

interface MepPriorityViewProps {
  dayTasks: MepTask[];
  ingredientStock: IngredientStockMap;
  onComplete: (task: MepTask) => void;
  onCancel: (taskId: string) => void;
  onPriorityChange: (taskId: string, prioriteit: string) => void;
  isLoading?: boolean;
}

export function MepPriorityView({
  dayTasks,
  ingredientStock,
  onComplete,
  onCancel,
  onPriorityChange,
  isLoading,
}: MepPriorityViewProps) {
  const { overtijd, openstaand, voltooid } = useMemo(() => {
    const overtijd: MepTask[] = [];
    const open: MepTask[] = [];
    const voltooid: MepTask[] = [];

    for (const t of dayTasks) {
      if (t.status === "completed") {
        voltooid.push(t);
      } else if (t.status === "cancelled") {
        // skip cancelled from active lists
      } else if (isTaskOverdue(t)) {
        overtijd.push(t);
      } else {
        open.push(t);
      }
    }

    // Sort open by priority score descending
    const scored = open
      .map((t) => ({ task: t, score: calculatePriorityScore(t, ingredientStock) }))
      .sort((a, b) => b.score - a.score);

    return {
      overtijd,
      openstaand: scored.map((s) => s.task),
      voltooid,
    };
  }, [dayTasks, ingredientStock]);

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
      {/* Overtijd */}
      <MepOvertijdGroup
        tasks={overtijd}
        onComplete={onComplete}
        onCancel={onCancel}
      />

      {/* Openstaand — flat sorted list */}
      {openstaand.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
          {openstaand.map((task) => (
            <MepTaskRow
              key={task.id}
              task={task}
              onComplete={onComplete}
              onCancel={onCancel}
              onPriorityChange={onPriorityChange}
              hint={getAssistantHint(task)}
            />
          ))}
        </div>
      )}

      {/* Voltooid vandaag */}
      <MepCompletedGroup tasks={voltooid} />
    </div>
  );
}
