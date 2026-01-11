import { useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { ShiftWizardProvider, useShiftWizard, TOTAL_STEPS } from "./ShiftWizardContext";
import { ShiftWizardSidebar } from "./ShiftWizardSidebar";
import { ShiftWizardFooter } from "./ShiftWizardFooter";
import { TimesStep } from "./steps/TimesStep";
import { TicketsStep } from "./steps/TicketsStep";
import { AreasStep } from "./steps/AreasStep";
import { CapacityStep } from "./steps/CapacityStep";
import { ReviewStep } from "./steps/ReviewStep";
import { useCreateShift, useUpdateShift, getNextShiftSortOrder, useAllShifts } from "@/hooks/useShifts";
import { parseSupabaseError } from "@/lib/supabaseErrors";
import { checkShiftOverlap, formatOverlapError } from "@/lib/shiftValidation";
import type { Shift } from "@/types/shifts";
import { NestoButton } from "@/components/polar/NestoButton";

interface ShiftWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  editingShift: Shift | null;
}

function ShiftWizardContent({ onClose }: { onClose: () => void }) {
  const {
    currentStep,
    name,
    shortName,
    startTime,
    endTime,
    daysOfWeek,
    interval,
    color,
    editingShift,
    locationId,
    setError,
    setIsSubmitting,
    isSubmitting,
    markStepComplete,
  } = useShiftWizard();

  const { data: allShifts = [] } = useAllShifts(locationId);
  const { mutate: createShift } = useCreateShift();
  const { mutate: updateShift } = useUpdateShift();

  // Generate short name suggestion
  const generateShortName = (n: string): string => {
    const trimmed = n.trim().toUpperCase();
    if (!trimmed) return "";
    if (trimmed.length <= 4) return trimmed;
    const words = trimmed.split(/\s+/);
    if (words.length > 1) {
      return words.map(w => w[0]).join("").slice(0, 4);
    }
    return trimmed.slice(0, 3);
  };

  const handleSubmit = useCallback(async () => {
    setError("");
    setIsSubmitting(true);

    const trimmedName = name.trim();
    const finalShortName = shortName.trim() || generateShortName(name);

    // Validation
    if (!trimmedName) {
      setError("Naam is verplicht.");
      setIsSubmitting(false);
      return;
    }
    if (trimmedName.length > 50) {
      setError("Naam mag maximaal 50 tekens zijn.");
      setIsSubmitting(false);
      return;
    }
    if (!finalShortName) {
      setError("Korte naam is verplicht.");
      setIsSubmitting(false);
      return;
    }
    if (finalShortName.length > 4) {
      setError("Korte naam mag maximaal 4 tekens zijn.");
      setIsSubmitting(false);
      return;
    }
    if (startTime >= endTime) {
      setError("Eindtijd moet na starttijd liggen.");
      setIsSubmitting(false);
      return;
    }
    if (daysOfWeek.length === 0) {
      setError("Selecteer minimaal één dag.");
      setIsSubmitting(false);
      return;
    }

    // Overlap check
    const overlapResult = checkShiftOverlap(
      { start_time: startTime, end_time: endTime, days_of_week: daysOfWeek },
      allShifts,
      editingShift?.id
    );

    if (overlapResult.hasOverlap) {
      setError(formatOverlapError(overlapResult.conflicts));
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingShift) {
        updateShift(
          {
            id: editingShift.id,
            name: trimmedName,
            short_name: finalShortName,
            start_time: startTime,
            end_time: endTime,
            days_of_week: daysOfWeek,
            arrival_interval_minutes: interval,
            color,
          },
          {
            onSuccess: () => {
              setIsSubmitting(false);
              onClose();
            },
            onError: (err) => {
              const parsed = parseSupabaseError(err);
              setError(parsed.message);
              setIsSubmitting(false);
            },
          }
        );
      } else {
        const sortOrder = await getNextShiftSortOrder(locationId);
        createShift(
          {
            location_id: locationId,
            name: trimmedName,
            short_name: finalShortName,
            start_time: startTime,
            end_time: endTime,
            days_of_week: daysOfWeek,
            arrival_interval_minutes: interval,
            color,
            sort_order: sortOrder,
          },
          {
            onSuccess: () => {
              setIsSubmitting(false);
              onClose();
            },
            onError: (err) => {
              const parsed = parseSupabaseError(err);
              setError(parsed.message);
              setIsSubmitting(false);
            },
          }
        );
      }
    } catch (err) {
      const parsed = parseSupabaseError(err);
      setError(parsed.message);
      setIsSubmitting(false);
    }
  }, [
    name,
    shortName,
    startTime,
    endTime,
    daysOfWeek,
    interval,
    color,
    editingShift,
    locationId,
    allShifts,
    createShift,
    updateShift,
    onClose,
    setError,
    setIsSubmitting,
  ]);

  const handleSaveAndClose = useCallback(async () => {
    // Only save if we have minimum required data (name and valid times)
    if (name.trim() && startTime < endTime && daysOfWeek.length > 0) {
      await handleSubmit();
    } else {
      onClose();
    }
  }, [name, startTime, endTime, daysOfWeek, handleSubmit, onClose]);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <TimesStep />;
      case 1:
        return <TicketsStep />;
      case 2:
        return <AreasStep />;
      case 3:
        return <CapacityStep />;
      case 4:
        return <ReviewStep />;
      default:
        return <TimesStep />;
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[85vh] min-h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <h2 className="text-lg font-semibold">
          {editingShift ? "Shift bewerken" : "Nieuwe shift"}
        </h2>
        <NestoButton
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Sluiten</span>
        </NestoButton>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <ShiftWizardSidebar />

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStep()}
        </div>
      </div>

      {/* Footer */}
      <ShiftWizardFooter onClose={handleSaveAndClose} onSubmit={handleSubmit} />
    </div>
  );
}

export function ShiftWizard({ open, onOpenChange, locationId, editingShift }: ShiftWizardProps) {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl p-0 gap-0 overflow-hidden rounded-card"
        hideCloseButton
      >
        <ShiftWizardProvider locationId={locationId} editingShift={editingShift}>
          <ShiftWizardContent onClose={handleClose} />
        </ShiftWizardProvider>
      </DialogContent>
    </Dialog>
  );
}
