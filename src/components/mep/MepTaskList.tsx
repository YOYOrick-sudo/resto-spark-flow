import { useState, useMemo } from "react";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { NestoButton } from "@/components/polar/NestoButton";
import { EmptyState } from "@/components/polar";
import { Check, X, ChevronDown, ChevronRight, ClipboardList } from "lucide-react";
import { useUpdateMepTask, useCancelMepTask } from "@/hooks/useMepMutations";
import { MepCompletionModal } from "./MepCompletionModal";
import type { MepTask } from "@/hooks/useMepTasks";
import { cn } from "@/lib/utils";

interface MepTaskListProps {
  tasks: MepTask[];
  isLoading: boolean;
}

const STATUS_CONFIG: Record<string, { variant: "default" | "success" | "error" | "pending"; label: string }> = {
  pending: { variant: "default", label: "Open" },
  in_progress: { variant: "pending", label: "Bezig" },
  completed: { variant: "success", label: "Klaar" },
  cancelled: { variant: "error", label: "Geannuleerd" },
};

export function MepTaskList({ tasks, isLoading }: MepTaskListProps) {
  const [completingTask, setCompletingTask] = useState<MepTask | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const updateTask = useUpdateMepTask();
  const cancelTask = useCancelMepTask();

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, MepTask[]> = {};
    tasks.forEach((t) => {
      const key = t.category || "overig";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [tasks]);

  const toggleGroup = (cat: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  // Check if deadline is overdue
  const isOverdue = (task: MepTask) => {
    if (!task.deadline || task.status === "completed" || task.status === "cancelled") return false;
    const now = new Date();
    const [h, m] = task.deadline.split(":").map(Number);
    const deadlineTime = new Date();
    deadlineTime.setHours(h, m, 0, 0);
    return now > deadlineTime;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Geen taken voor deze dag"
        description="Voeg taken toe via het zoekveld hierboven."
      />
    );
  }

  const categoryLabels: Record<string, string> = {
    halffabricaat: "Halffabricaten",
    mise_en_place: "Mise en place",
    schoonmaak: "Schoonmaak",
    overig: "Overig",
  };

  return (
    <>
      <div className="space-y-4">
        {Object.entries(grouped).map(([category, catTasks]) => {
          const isCollapsed = collapsedGroups.has(category);
          const completedCount = catTasks.filter((t) => t.status === "completed").length;
          const hasOverdue = catTasks.some(isOverdue);

          return (
            <div key={category} className="border border-border rounded-lg overflow-hidden">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(category)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 min-h-[48px] transition-colors",
                  hasOverdue ? "bg-error-light" : "bg-muted/30",
                )}
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span className="font-medium text-sm">
                    {categoryLabels[category] || category}
                  </span>
                  <NestoBadge variant="default" size="sm">
                    {completedCount}/{catTasks.length}
                  </NestoBadge>
                </div>
              </button>

              {/* Task rows */}
              {!isCollapsed && (
                <div className="divide-y divide-border">
                  {catTasks.map((task) => {
                    const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                    const overdue = isOverdue(task);

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 min-h-[56px]",
                          overdue && "bg-error-light/50",
                          task.status === "completed" && "opacity-60",
                          task.status === "cancelled" && "opacity-40",
                        )}
                      >
                        {/* Task info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-sm font-medium truncate",
                                task.status === "completed" && "line-through",
                              )}
                            >
                              {task.title}
                            </span>
                            {task.prioriteit === "Hoog" && (
                              <NestoBadge variant="error" size="sm">
                                Hoog
                              </NestoBadge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {task.units && (
                              <span className="text-xs text-muted-foreground">
                                {task.units}×
                                {task.methode
                                  ? ` ${task.methode.visuele_eenheid}`
                                  : ""}
                              </span>
                            )}
                            {task.deadline && (
                              <span
                                className={cn(
                                  "text-xs",
                                  overdue
                                    ? "text-destructive font-medium"
                                    : "text-muted-foreground",
                                )}
                              >
                                ⏰ {task.deadline}
                              </span>
                            )}
                            {task.assigned_profile?.name && (
                              <span className="text-xs text-muted-foreground">
                                → {task.assigned_profile.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status badge */}
                        <NestoBadge variant={status.variant} size="sm">
                          {status.label}
                        </NestoBadge>

                        {/* Actions */}
                        {task.status === "pending" || task.status === "in_progress" ? (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <NestoButton
                              variant="primary"
                              size="icon"
                              className="h-11 w-11"
                              onClick={() => setCompletingTask(task)}
                              title="Afronden"
                            >
                              <Check className="h-5 w-5" />
                            </NestoButton>
                            <NestoButton
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11"
                              onClick={() => cancelTask.mutate(task.id)}
                              title="Annuleren"
                            >
                              <X className="h-4 w-4" />
                            </NestoButton>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion modal */}
      {completingTask && (
        <MepCompletionModal
          task={completingTask}
          open={!!completingTask}
          onOpenChange={(open) => !open && setCompletingTask(null)}
        />
      )}
    </>
  );
}
