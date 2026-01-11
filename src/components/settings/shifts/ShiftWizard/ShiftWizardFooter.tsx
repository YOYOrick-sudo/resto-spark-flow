import { NestoButton } from "@/components/polar/NestoButton";
import { useShiftWizard } from "./ShiftWizardContext";

interface ShiftWizardFooterProps {
  onClose: () => void;
  onSubmit: () => void;
}

export function ShiftWizardFooter({ onClose, onSubmit }: ShiftWizardFooterProps) {
  const { currentStep, canProceed, nextStep, prevStep, isSubmitting, isEditing } = useShiftWizard();

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === 3;

  const handleNext = () => {
    if (isLastStep) {
      onSubmit();
    } else {
      nextStep();
    }
  };

  return (
    <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-card">
      <div>
        {!isFirstStep && (
          <NestoButton variant="ghost" onClick={prevStep} disabled={isSubmitting}>
            Vorige
          </NestoButton>
        )}
      </div>

      <div className="flex items-center gap-2">
        <NestoButton variant="outline" onClick={onClose} disabled={isSubmitting}>
          Opslaan & sluiten
        </NestoButton>
        <NestoButton onClick={handleNext} disabled={!canProceed || isSubmitting}>
          {isSubmitting
            ? "Opslaan..."
            : isLastStep
              ? isEditing
                ? "Wijzigingen opslaan"
                : "Shift aanmaken"
              : "Volgende"}
        </NestoButton>
      </div>
    </div>
  );
}
