import * as React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Check } from "lucide-react";
import { NestoButton } from "./NestoButton";
import { ConfirmDialog } from "./ConfirmDialog";
import { cn } from "@/lib/utils";

export interface WizardStep {
  id: string;
  title: string;
  subtitle?: string;
  component: React.ReactNode;
  isOptional?: boolean;
  validate?: (data: any) => string | null;
}

export interface StepWizardProps {
  steps: WizardStep[];
  onComplete: (data: Record<string, any>) => Promise<void> | void;
  onCancel: () => void;
  backLink: string;
  backLabel: string;
  initialData?: Record<string, any>;
}

interface StepWizardContextType {
  formData: Record<string, any>;
  setStepData: (stepId: string, data: any) => void;
  currentStepIndex: number;
}

const StepWizardContext = React.createContext<StepWizardContextType | null>(null);

export function useStepWizard() {
  const ctx = React.useContext(StepWizardContext);
  if (!ctx) throw new Error("useStepWizard must be used within StepWizard");
  return ctx;
}

export function StepWizard({
  steps,
  onComplete,
  onCancel,
  backLink,
  backLabel,
  initialData = {},
}: StepWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [formData, setFormData] = React.useState<Record<string, any>>(initialData);
  const [visitedSteps, setVisitedSteps] = React.useState<Set<number>>(new Set([0]));
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const isDirty = Object.keys(formData).length > 0;
  const isLastStep = currentStep === steps.length - 1;
  const step = steps[currentStep];

  const setStepData = React.useCallback((stepId: string, data: any) => {
    setFormData((prev) => ({ ...prev, [stepId]: data }));
    setValidationError(null);
  }, []);

  const goToStep = (index: number) => {
    if (index < currentStep || visitedSteps.has(index)) {
      setValidationError(null);
      setCurrentStep(index);
    }
  };

  const goNext = () => {
    if (step.validate) {
      const error = step.validate(formData);
      if (error) {
        setValidationError(error);
        return;
      }
    }
    setValidationError(null);
    const next = currentStep + 1;
    setVisitedSteps((prev) => new Set(prev).add(next));
    setCurrentStep(next);
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setValidationError(null);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (step.validate) {
      const error = step.validate(formData);
      if (error) {
        setValidationError(error);
        return;
      }
    }
    setIsSaving(true);
    try {
      await onComplete(formData);
    } catch {
      // Error handling in parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      setCancelOpen(true);
    } else {
      onCancel();
    }
  };

  const ctx = React.useMemo(
    () => ({ formData, setStepData, currentStepIndex: currentStep }),
    [formData, setStepData, currentStep]
  );

  return (
    <StepWizardContext.Provider value={ctx}>
      <div className="space-y-6">
        {/* Header: back + cancel */}
        <div className="flex items-center justify-between">
          <Link
            to={backLink}
            onClick={(e) => {
              if (isDirty) {
                e.preventDefault();
                setCancelOpen(true);
              }
            }}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] w-fit"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{backLabel}</span>
          </Link>
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-2"
          >
            Annuleren
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0">
          {steps.map((s, i) => {
            const isCompleted = i < currentStep;
            const isActive = i === currentStep;
            const isClickable = i < currentStep || visitedSteps.has(i);

            return (
              <React.Fragment key={s.id}>
                {i > 0 && (
                  <div
                    className={cn(
                      "h-[2px] w-8 sm:w-12 transition-colors",
                      i <= currentStep ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
                <button
                  type="button"
                  onClick={() => isClickable && goToStep(i)}
                  disabled={!isClickable}
                  className={cn(
                    "transition-colors",
                    isClickable && !isActive && "cursor-pointer",
                    !isClickable && "cursor-default"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors shrink-0",
                      isActive && "bg-primary text-primary-foreground",
                      isCompleted && "bg-primary/10 text-primary",
                      !isActive && !isCompleted && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Current step label */}
        <p className="text-center text-sm text-muted-foreground">
          Stap {currentStep + 1} van {steps.length}
          {step.isOptional && " (optioneel)"}
        </p>

        {/* Content */}
        <div className="max-w-[640px] mx-auto space-y-6">
          <div>
            <h2 className="text-xl font-semibold">{step.title}</h2>
            {step.subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{step.subtitle}</p>
            )}
          </div>

          {validationError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {validationError}
            </div>
          )}

          <div>{step.component}</div>
        </div>

        {/* Footer */}
        <div className="max-w-[640px] mx-auto flex items-center justify-between pt-4 border-t border-border/30">
          {currentStep > 0 ? (
            <NestoButton variant="outline" onClick={goPrev}>
              Vorige
            </NestoButton>
          ) : (
            <div />
          )}

          {isLastStep ? (
            <NestoButton
              onClick={handleComplete}
              isLoading={isSaving}
              
              className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white"
            >
              Opslaan
            </NestoButton>
          ) : (
            <NestoButton onClick={goNext}>
              Volgende
            </NestoButton>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Wijzigingen annuleren?"
        description="Niet-opgeslagen wijzigingen gaan verloren."
        confirmLabel="Ja, annuleren"
        cancelLabel="Terug naar wizard"
        onConfirm={onCancel}
        variant="destructive"
      />
    </StepWizardContext.Provider>
  );
}
