import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Template' },
  { id: 2, label: 'Inhoud' },
  { id: 3, label: 'Doelgroep' },
  { id: 4, label: 'Planning' },
  { id: 5, label: 'Bevestigen' },
];

interface BuilderSidebarProps {
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (step: number) => void;
}

export function BuilderSidebar({ currentStep, completedSteps, onStepClick }: BuilderSidebarProps) {
  return (
    <nav className="w-60 shrink-0 bg-secondary border border-border rounded-card p-5 h-fit sticky top-6">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Stappen</h3>
      <ol className="space-y-1">
        {STEPS.map((step) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.has(step.id);
          const isReachable = step.id <= currentStep || completedSteps.has(step.id) || completedSteps.has(step.id - 1);

          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!isReachable}
                onClick={() => isReachable && onStepClick(step.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-button text-sm transition-all duration-150',
                  isActive && 'bg-primary/10 border border-primary/20 text-primary font-semibold',
                  !isActive && isCompleted && 'text-success hover:bg-accent/40',
                  !isActive && !isCompleted && isReachable && 'text-muted-foreground hover:bg-accent/40',
                  !isReachable && 'text-muted-foreground/50 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0',
                    isActive && 'bg-primary text-primary-foreground',
                    !isActive && isCompleted && 'bg-success/10 text-success',
                    !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isCompleted && !isActive ? <Check className="h-3.5 w-3.5" /> : step.id}
                </span>
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
