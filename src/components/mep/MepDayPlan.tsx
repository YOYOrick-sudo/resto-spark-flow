import { useMemo } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { NestoPanel } from "@/components/polar/NestoPanel";
import { NestoButton } from "@/components/polar/NestoButton";
import { Sparkles, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { planDay, getEstimatedEndTime, type PlannedStep } from "@/utils/mepDayPlanner";
import type { MepTask } from "@/hooks/useMepTasks";

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮"];

interface MepDayPlanProps {
  open: boolean;
  onClose: () => void;
  tasks: MepTask[];
  selectedDate: string;
  onApply: (taskOrder: string[]) => void;
}

export function MepDayPlan({ open, onClose, tasks, selectedDate, onApply }: MepDayPlanProps) {
  const steps = useMemo(() => planDay(tasks), [tasks]);
  const endTime = useMemo(() => getEstimatedEndTime(steps), [steps]);
  const dateLabel = format(new Date(selectedDate), "EEEE d MMMM", { locale: nl });

  const handleApply = () => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const step of steps) {
      if (!seen.has(step.task_id)) {
        seen.add(step.task_id);
        order.push(step.task_id);
      }
    }
    onApply(order);
    onClose();
  };

  return (
    <NestoPanel
      open={open}
      onClose={onClose}
      title="Plan mijn dag"
      footer={
        <div className="flex gap-2">
          <NestoButton variant="primary" className="flex-1" onClick={handleApply}>
            Pas toe
          </NestoButton>
          <NestoButton variant="ghost" onClick={onClose}>
            Sluiten
          </NestoButton>
        </div>
      }
    >
      {(titleRef) => (
        <div className="px-5 py-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                Assistent
              </span>
            </div>
            <h2 ref={titleRef} className="text-lg font-semibold text-foreground capitalize">
              Plan voor {dateLabel}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {steps.length} stappen · geschatte eindtijd{" "}
              <span className="font-medium text-foreground">
                {endTime ? format(endTime, "HH:mm") : "—"}
              </span>
            </p>
          </div>

          <div className="space-y-1">
            {steps.map((step, i) => (
              <StepRow key={`${step.task_id}-${i}`} step={step} index={i} />
            ))}
          </div>

          {endTime && endTime.getHours() >= 17 && (
            <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              Let op: dit plan duurt tot {format(endTime, "HH:mm")}. Mogelijk niet alles haalbaar voor sluitingstijd.
            </div>
          )}
        </div>
      )}
    </NestoPanel>
  );
}

function StepRow({ step, index }: { step: PlannedStep; index: number }) {
  const circled = CIRCLED[index] ?? `${index + 1}.`;
  const timeLabel = format(step.start_time, "HH:mm");

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg px-3 py-3 transition-colors",
        step.is_followup ? "bg-primary/[0.04]" : "hover:bg-muted/30"
      )}
    >
      <div className="flex flex-col items-center w-14 flex-shrink-0 pt-0.5">
        <span className="text-base font-semibold text-foreground">{circled}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{timeLabel}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {step.is_followup && (
            <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          )}
          <span className={cn("text-sm font-medium truncate", step.is_followup && "text-muted-foreground")}>
            {step.is_followup ? `${step.task_title} afmaken` : step.task_title}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {step.active_minutes} min actief
          </span>
          {step.passive_minutes > 0 && (
            <span className="text-xs text-muted-foreground">
              · daarna {step.passive_minutes} min wachttijd
            </span>
          )}
        </div>

        {step.note && !step.is_followup && (
          <span className="text-xs text-primary/70 italic mt-0.5 block">
            {step.note}
          </span>
        )}
      </div>
    </div>
  );
}
