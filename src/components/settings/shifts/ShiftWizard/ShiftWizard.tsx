import { useCallback, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { ShiftWizardProvider, useShiftWizard, TOTAL_STEPS } from "./ShiftWizardContext";
import { ShiftWizardSidebar } from "./ShiftWizardSidebar";
import { ShiftWizardFooter } from "./ShiftWizardFooter";
import { TimesStep } from "./steps/TimesStep";
import { TicketsStep } from "./steps/TicketsStep";
import { ConfigStep } from "./steps/ConfigStep";
import { CapacityStep } from "./steps/CapacityStep";
import { ReviewStep } from "./steps/ReviewStep";
import { useCreateShift, useUpdateShift, getNextShiftSortOrder, useAllShifts } from "@/hooks/useShifts";
import { useShiftTickets, useSyncShiftTickets } from "@/hooks/useShiftTickets";
import { parseSupabaseError } from "@/lib/supabaseErrors";
import { checkShiftOverlap, formatOverlapError } from "@/lib/shiftValidation";
import { ConfirmDialog } from "@/components/polar/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
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
    selectedTickets,
    ticketOverrides,
    initialShiftTickets,
    setError,
    setIsSubmitting,
    isSubmitting,
    markStepComplete,
  } = useShiftWizard();

  const { data: allShifts = [] } = useAllShifts(locationId);
  const { mutate: createShift } = useCreateShift();
  const { mutate: updateShift } = useUpdateShift();
  const { mutateAsync: syncTickets } = useSyncShiftTickets();

  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [pendingShiftId, setPendingShiftId] = useState<string | null>(null);

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

  // After shift save, sync tickets
  const handleTicketSync = useCallback(async (shiftId: string) => {
    try {
      await syncTickets({ shiftId, locationId, selectedTickets, ticketOverrides });
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      setError(parseSupabaseError(err).message);
      setIsSubmitting(false);
    }
  }, [syncTickets, locationId, selectedTickets, ticketOverrides, setIsSubmitting, setError, onClose]);

  // Check if tickets are being unlinked
  const getUnlinkedTicketCount = useCallback((): number => {
    if (!editingShift) return 0;
    const initialIds = initialShiftTickets.map((st) => st.ticket_id);
    return initialIds.filter((id) => !selectedTickets.includes(id)).length;
  }, [editingShift, initialShiftTickets, selectedTickets]);

  const executeSave = useCallback(async (shiftIdOverride?: string) => {
    const trimmedName = name.trim();
    const finalShortName = shortName.trim() || generateShortName(name);

    if (!trimmedName) { setError("Naam is verplicht."); setIsSubmitting(false); return; }
    if (trimmedName.length > 50) { setError("Naam mag maximaal 50 tekens zijn."); setIsSubmitting(false); return; }
    if (!finalShortName) { setError("Korte naam is verplicht."); setIsSubmitting(false); return; }
    if (finalShortName.length > 4) { setError("Korte naam mag maximaal 4 tekens zijn."); setIsSubmitting(false); return; }
    if (startTime >= endTime) { setError("Eindtijd moet na starttijd liggen."); setIsSubmitting(false); return; }
    if (daysOfWeek.length === 0) { setError("Selecteer minimaal één dag."); setIsSubmitting(false); return; }

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

    // If we already have a shiftId (from confirm dialog flow), just sync tickets
    if (shiftIdOverride) {
      await handleTicketSync(shiftIdOverride);
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
            onSuccess: () => handleTicketSync(editingShift.id),
            onError: (err) => { setError(parseSupabaseError(err).message); setIsSubmitting(false); },
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
            onSuccess: (data) => handleTicketSync(data.id),
            onError: (err) => { setError(parseSupabaseError(err).message); setIsSubmitting(false); },
          }
        );
      }
    } catch (err) {
      setError(parseSupabaseError(err).message);
      setIsSubmitting(false);
    }
  }, [name, shortName, startTime, endTime, daysOfWeek, interval, color, editingShift, locationId, allShifts, createShift, updateShift, handleTicketSync, setError, setIsSubmitting]);

  const handleSubmit = useCallback(async () => {
    setError("");
    setIsSubmitting(true);

    const unlinkCount = getUnlinkedTicketCount();
    if (unlinkCount > 0) {
      setPendingShiftId(editingShift?.id ?? null);
      setShowUnlinkConfirm(true);
      setIsSubmitting(false);
      return;
    }

    await executeSave();
  }, [setError, setIsSubmitting, getUnlinkedTicketCount, editingShift, executeSave]);

  const handleConfirmUnlink = useCallback(async () => {
    setShowUnlinkConfirm(false);
    setIsSubmitting(true);
    await executeSave();
  }, [executeSave, setIsSubmitting]);

  const handleSaveAndClose = useCallback(async () => {
    if (name.trim() && startTime < endTime && daysOfWeek.length > 0) {
      await handleSubmit();
    } else {
      onClose();
    }
  }, [name, startTime, endTime, daysOfWeek, handleSubmit, onClose]);

  const renderStep = () => {
    switch (currentStep) {
      case 0: return <TimesStep />;
      case 1: return <TicketsStep />;
      case 2: return <ConfigStep />;
      case 3: return <CapacityStep />;
      case 4: return <ReviewStep />;
      default: return <TimesStep />;
    }
  };

  const unlinkCount = getUnlinkedTicketCount();

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <h2 className="text-lg font-semibold">
          {editingShift ? "Shift bewerken" : "Nieuwe shift"}
        </h2>
        <NestoButton variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-5 w-5" />
          <span className="sr-only">Sluiten</span>
        </NestoButton>
      </div>

      <div className="flex flex-1">
        <ShiftWizardSidebar />
        <div className="flex-1 p-5">
          {renderStep()}
        </div>
      </div>

      <ShiftWizardFooter onClose={handleSaveAndClose} onSubmit={handleSubmit} />

      <ConfirmDialog
        open={showUnlinkConfirm}
        onOpenChange={setShowUnlinkConfirm}
        title="Tickets ontkoppelen?"
        description={`${unlinkCount} ticket(s) worden ontkoppeld van deze shift. Ingestelde overrides gaan verloren.`}
        confirmLabel="Ontkoppelen"
        variant="destructive"
        onConfirm={handleConfirmUnlink}
      />
    </div>
  );
}

export function ShiftWizard({ open, onOpenChange, locationId, editingShift }: ShiftWizardProps) {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const { data: existingShiftTickets, isLoading: isLoadingTickets } = useShiftTickets(editingShift?.id);

  // Don't render the wizard until existing shift_tickets are loaded (edit mode)
  const isReady = !editingShift || !isLoadingTickets;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden rounded-card" hideCloseButton>
        {isReady ? (
          <ShiftWizardProvider
            locationId={locationId}
            editingShift={editingShift}
            initialShiftTickets={existingShiftTickets ?? []}
          >
            <ShiftWizardContent onClose={handleClose} />
          </ShiftWizardProvider>
        ) : (
          <div className="flex flex-col">
            <div className="px-6 py-4 border-b border-border">
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="flex flex-1">
              <div className="w-48 shrink-0 border-r border-border p-3 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex-1 p-5 space-y-4">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
