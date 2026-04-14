import { useState } from "react";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { NestoButton } from "@/components/polar/NestoButton";
import { ConfirmDialog } from "@/components/polar/ConfirmDialog";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MepTask } from "@/hooks/useMepTasks";

const STATUS_CONFIG: Record<
  string,
  { variant: "outline" | "primary" | "success" | "default"; label: string }
> = {
  pending: { variant: "outline", label: "Open" },
  in_progress: { variant: "primary", label: "Bezig" },
  completed: { variant: "success", label: "Klaar" },
  cancelled: { variant: "default", label: "Geannuleerd" },
};

interface MepTaskRowProps {
  task: MepTask;
  isOverdue?: boolean;
  onComplete: (task: MepTask) => void;
  onCancel: (taskId: string) => void;
}

export function MepTaskRow({ task, isOverdue, onComplete, onCancel }: MepTaskRowProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const isActive = task.status === "pending" || task.status === "in_progress";
  const isDone = task.status === "completed" || task.status === "cancelled";

  // Deadline urgency: within 1 hour or overdue
  const deadlineUrgent = (() => {
    if (!task.deadline || isDone) return false;
    const now = new Date();
    const [h, m] = task.deadline.split(":").map(Number);
    const dl = new Date();
    dl.setHours(h, m, 0, 0);
    const diffMs = dl.getTime() - now.getTime();
    return diffMs < 60 * 60 * 1000; // less than 1 hour or past
  })();

  const formattedDeadline = task.deadline
    ? task.deadline.substring(0, 5)
    : null;

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 min-h-[56px] transition-colors",
          isOverdue && "border-l-[3px] border-l-destructive",
          isDone && "opacity-50"
        )}
      >
        {/* Task info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-medium truncate",
                isDone && "line-through"
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
                {task.methode ? ` ${task.methode.visuele_eenheid}` : ""}
              </span>
            )}
            {formattedDeadline && (
              <span
                className={cn(
                  "text-xs",
                  deadlineUrgent
                    ? "text-destructive font-medium"
                    : "text-muted-foreground"
                )}
              >
                ⏰ {formattedDeadline}
              </span>
            )}
          </div>
        </div>

        {/* Status badge — alleen bij in_progress en cancelled */}
        {task.status === "in_progress" && (
          <NestoBadge variant="primary" size="sm">Bezig</NestoBadge>
        )}
        {task.status === "cancelled" && (
          <NestoBadge variant="default" size="sm">Geannuleerd</NestoBadge>
        )}

        {/* Action buttons */}
        {isActive && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <NestoButton
              variant="primary"
              size="icon"
              className="h-11 w-11"
              onClick={() => onComplete(task)}
              title="Afronden"
            >
              <Check className="h-5 w-5" />
            </NestoButton>
            <NestoButton
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={() => setConfirmCancel(true)}
              title="Annuleren"
            >
              <X className="h-4 w-4" />
            </NestoButton>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Taak annuleren?"
        description={`Weet je zeker dat je "${task.title}" wilt annuleren?`}
        confirmLabel="Annuleren"
        variant="destructive"
        onConfirm={() => {
          setConfirmCancel(false);
          onCancel(task.id);
        }}
      />
    </>
  );
}
