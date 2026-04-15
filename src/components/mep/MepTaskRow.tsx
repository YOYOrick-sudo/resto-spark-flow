import { useState } from "react";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { NestoButton } from "@/components/polar/NestoButton";
import { ConfirmDialog } from "@/components/polar/ConfirmDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MepAssistantHint } from "./MepAssistantHint";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MepTask } from "@/hooks/useMepTasks";

interface MepTaskRowProps {
  task: MepTask;
  isOverdue?: boolean;
  onComplete: (task: MepTask) => void;
  onCancel: (taskId: string) => void;
  onPriorityChange?: (taskId: string, prioriteit: string) => void;
  hint?: string | null;
}

const PRIORITY_OPTIONS = [
  { value: "Hoog", label: "Hoog", variant: "error" as const },
  { value: "Normaal", label: "Normaal", variant: null },
  { value: "Laag", label: "Laag", variant: "default" as const },
];

export function MepTaskRow({ task, isOverdue, onComplete, onCancel, onPriorityChange, hint }: MepTaskRowProps) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [prioOpen, setPrioOpen] = useState(false);
  const isActive = task.status === "pending" || task.status === "in_progress";
  const isDone = task.status === "completed" || task.status === "cancelled";

  // Left border color based on priority / overdue
  const borderClass = isOverdue || task.prioriteit === "Hoog"
    ? "border-l-[3px] border-l-destructive"
    : task.prioriteit === "Laag"
      ? "border-l-[3px] border-l-muted-foreground/30"
      : "";

  // Deadline urgency
  const deadlineUrgent = (() => {
    if (!task.deadline || isDone) return false;
    const now = new Date();
    const [h, m] = task.deadline.split(":").map(Number);
    const dl = new Date();
    dl.setHours(h, m, 0, 0);
    return dl.getTime() - now.getTime() < 60 * 60 * 1000;
  })();

  const formattedDeadline = task.deadline ? task.deadline.substring(0, 5) : null;

  const methodeType = task.methode?.type?.toLowerCase();
  const showMethode = methodeType && !task.title.toLowerCase().includes(methodeType);

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 min-h-[56px] transition-colors",
          borderClass,
          isDone && "opacity-50"
        )}
      >
        {/* Task info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-medium truncate", isDone && "line-through")}>
              {(task.units ?? 1) > 1 ? `${task.units}× ` : ""}{task.title}
            </span>
            {showMethode && (
              <span className="text-xs text-muted-foreground font-normal shrink-0">
                {methodeType}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {task.methode?.visuele_eenheid && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {task.units ?? 1}× {task.methode.visuele_eenheid}
              </span>
            )}
            {formattedDeadline && (
              <span className={cn("text-xs", deadlineUrgent ? "text-destructive font-medium" : "text-muted-foreground")}>
                ⏰ {formattedDeadline}
              </span>
            )}
          </div>
          {hint && <MepAssistantHint hint={hint} />}
        </div>

        {/* Priority badge — clickable dropdown */}
        {isActive && onPriorityChange && (
          <Popover open={prioOpen} onOpenChange={setPrioOpen}>
            <PopoverTrigger asChild>
              {task.prioriteit === "Hoog" ? (
                <button className="flex-shrink-0">
                  <NestoBadge variant="error" size="sm" className="cursor-pointer">
                    Hoog
                  </NestoBadge>
                </button>
              ) : task.prioriteit === "Laag" ? (
                <button className="flex-shrink-0">
                  <NestoBadge variant="default" size="sm" className="cursor-pointer">
                    Laag
                  </NestoBadge>
                </button>
              ) : (
                <button className="flex-shrink-0 text-xs text-muted-foreground hover:text-foreground px-1">
                  ···
                </button>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-36 p-1" align="end">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors",
                    task.prioriteit === opt.value && "bg-accent font-medium"
                  )}
                  onClick={() => {
                    onPriorityChange(task.id, opt.value);
                    setPrioOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}

        {/* Static priority badge for completed/cancelled */}
        {isDone && task.prioriteit === "Hoog" && (
          <NestoBadge variant="error" size="sm">Hoog</NestoBadge>
        )}

        {/* Status badge — only in_progress and cancelled */}
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
