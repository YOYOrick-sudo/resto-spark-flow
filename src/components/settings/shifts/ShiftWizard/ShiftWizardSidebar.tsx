import { Clock, Ticket, Users, CheckCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShiftWizard } from "./ShiftWizardContext";

const STEPS = [
  { id: 0, label: "Tijden", icon: Clock },
  { id: 1, label: "Tickets", icon: Ticket },
  { id: 2, label: "Capaciteit", icon: Users },
  { id: 3, label: "Overzicht", icon: CheckCircle },
];

export function ShiftWizardSidebar() {
  const { currentStep, completedSteps, goToStep, stepSummaries, canProceed } = useShiftWizard();

  const handleStepClick = (stepId: number) => {
    // Allow navigation to completed steps or the next available step
    if (completedSteps.has(stepId) || stepId <= currentStep || (stepId === currentStep + 1 && canProceed)) {
      goToStep(stepId);
    }
  };

  return (
    <div className="w-48 shrink-0 border-r border-border bg-muted/30 p-4">
      <nav className="space-y-1">
        {STEPS.map((step) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.has(step.id);
          const isPast = step.id < currentStep;
          const isClickable = isCompleted || step.id <= currentStep || (step.id === currentStep + 1 && canProceed);
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-lg transition-all",
                "flex flex-col gap-0.5",
                isActive && "bg-card border border-border shadow-sm",
                !isActive && isClickable && "hover:bg-accent/50 cursor-pointer",
                !isClickable && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-2">
                {(isCompleted || isPast) && !isActive ? (
                  <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center">
                    <Check className="w-3 h-3 text-success-foreground" />
                  </div>
                ) : (
                  <Icon
                    className={cn(
                      "w-4 h-4",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              <span className="text-xs text-muted-foreground pl-7 truncate">
                {stepSummaries[step.id]}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
