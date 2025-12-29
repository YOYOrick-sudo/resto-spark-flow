import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalStep {
  label: string;
  completed?: boolean;
}

export interface NestoModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  steps?: ModalStep[];
  currentStep?: number;
  size?: "sm" | "md" | "lg" | "xl";
  showClose?: boolean;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function NestoModal({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  steps,
  currentStep = 0,
  size = "md",
  showClose = true,
}: NestoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn(
          "rounded-card border border-border bg-card p-0 gap-0",
          sizeClasses[size]
        )}
      >
        <DialogHeader className="p-6 pb-4">
          {steps && steps.length > 0 && (
            <StepIndicator steps={steps} currentStep={currentStep} />
          )}
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-h2">{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-1.5 text-small text-muted-foreground">
                  {description}
                </DialogDescription>
              )}
            </div>
            {showClose && (
              <DialogClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <X className="h-5 w-5" />
                <span className="sr-only">Sluiten</span>
              </DialogClose>
            )}
          </div>
        </DialogHeader>

        <div className="px-6 pb-6">{children}</div>

        {footer && (
          <DialogFooter className="border-t border-border px-6 py-4">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface StepIndicatorProps {
  steps: ModalStep[];
  currentStep: number;
}

function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {steps.map((step, index) => {
        const isCompleted = step.completed || index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <React.Fragment key={index}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  isCompleted
                    ? "bg-success text-success-foreground"
                    : isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-small",
                  isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8",
                  isCompleted ? "bg-success" : "bg-border"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export { StepIndicator };
