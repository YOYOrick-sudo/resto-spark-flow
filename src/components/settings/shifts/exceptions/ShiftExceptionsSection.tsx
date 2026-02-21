import { useState, useMemo } from "react";
import { startOfMonth, endOfMonth, addMonths, format } from "date-fns";
import { Ban, Clock, Star, Repeat } from "lucide-react";
import { NestoCard } from "@/components/polar/NestoCard";
import { FieldHelp } from "@/components/polar/FieldHelp";
import { NestoButton } from "@/components/polar/NestoButton";
import { EmptyState } from "@/components/polar/EmptyState";
import { ConfirmDialog } from "@/components/polar/ConfirmDialog";
import { useShifts } from "@/hooks/useShifts";
import { useShiftExceptions, useDeleteShiftException } from "@/hooks/useShiftExceptions";
import { ExceptionCalendar } from "./ExceptionCalendar";
import { ExceptionListItem } from "./ExceptionListItem";
import { ShiftExceptionModal } from "./ShiftExceptionModal";
import { BulkExceptionModal } from "./BulkExceptionModal";
import type { ShiftException, ShiftExceptionType, Shift } from "@/types/shifts";

interface ShiftExceptionsSectionProps {
  locationId: string;
}

export function ShiftExceptionsSection({ locationId }: ShiftExceptionsSectionProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingException, setEditingException] = useState<ShiftException | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();
  const [defaultType, setDefaultType] = useState<ShiftExceptionType | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exceptionToDelete, setExceptionToDelete] = useState<ShiftException | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // Fetch shifts for the location
  const { data: shifts = [] } = useShifts(locationId);

  // Build shift map for quick lookup
  const shiftsMap = useMemo(() => {
    const map = new Map<string, Shift>();
    shifts.forEach((s) => map.set(s.id, s));
    return map;
  }, [shifts]);

  // Calculate date range for current month view
  const dateRange = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const nextMonthStart = startOfMonth(addMonths(selectedMonth, 1));
    return {
      from: format(monthStart, "yyyy-MM-dd"),
      to: format(nextMonthStart, "yyyy-MM-dd"),
    };
  }, [selectedMonth]);

  // Fetch exceptions for the visible month
  const { data: exceptions = [], isLoading } = useShiftExceptions(locationId, dateRange);

  // Delete mutation
  const deleteMutation = useDeleteShiftException();

  // Handlers for quick actions
  const handleQuickAction = (type: ShiftExceptionType) => {
    setEditingException(null);
    setDefaultDate(undefined);
    setDefaultType(type);
    setModalOpen(true);
  };

  // Handler for calendar day click
  const handleDayClick = (date: Date, existingExceptions: ShiftException[]) => {
    setDefaultDate(date);
    setDefaultType(undefined);
    
    if (existingExceptions.length > 0) {
      // If day has exceptions, edit the first one
      setEditingException(existingExceptions[0]);
    } else {
      // If no exceptions, create new
      setEditingException(null);
    }
    setModalOpen(true);
  };

  // Handler for edit
  const handleEdit = (exception: ShiftException) => {
    setEditingException(exception);
    setDefaultDate(new Date(exception.exception_date));
    setDefaultType(undefined);
    setModalOpen(true);
  };

  // Handler for delete
  const handleDeleteClick = (exception: ShiftException) => {
    setExceptionToDelete(exception);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!exceptionToDelete) return;
    await deleteMutation.mutateAsync(exceptionToDelete.id);
    setDeleteDialogOpen(false);
    setExceptionToDelete(null);
  };

  return (
    <NestoCard className="p-6 border border-border">
      {/* Header with quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-semibold">Uitzonderingen</h3>
            <FieldHelp>
              <p className="text-muted-foreground">Eenmalige afwijkingen van het standaard shift-schema, zoals gesloten dagen of aangepaste tijden.</p>
            </FieldHelp>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gesloten dagen, aangepaste tijden en speciale markeringen.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <NestoButton
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction("closed")}
          >
            <Ban className="h-3.5 w-3.5 mr-1.5" />
            Dag sluiten
          </NestoButton>
          <NestoButton
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction("modified")}
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Aangepast
          </NestoButton>
          <NestoButton
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction("special")}
          >
            <Star className="h-3.5 w-3.5 mr-1.5" />
            Speciaal
          </NestoButton>
          <NestoButton
            variant="outline"
            size="sm"
            onClick={() => setBulkModalOpen(true)}
          >
            <Repeat className="h-3.5 w-3.5 mr-1.5" />
            Periode
          </NestoButton>
        </div>
      </div>

      {/* Main content: Calendar + List */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Calendar */}
        <div>
          <ExceptionCalendar
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            exceptions={exceptions}
            onDayClick={handleDayClick}
          />

          {/* Legend */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span>Gesloten</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Aangepaste tijden</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Speciaal</span>
            </div>
          </div>
        </div>

        {/* Exceptions list */}
        <div className="flex flex-col">
          {/* List header with count */}
          {exceptions.length > 0 && (
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-caption text-muted-foreground uppercase tracking-wider">
                Lijst
              </span>
              <span className="text-xs text-muted-foreground">
                {exceptions.length} {exceptions.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          )}
          
          {/* Scrollable list container */}
          <div className="relative">
            <div className="min-h-[160px] max-h-[280px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <span className="text-sm text-muted-foreground">Laden...</span>
                </div>
              ) : exceptions.length === 0 ? (
                <EmptyState
                  icon={Ban}
                  title="Geen uitzonderingen"
                  description="Er zijn nog geen uitzonderingen voor deze maand. Klik op een dag of gebruik de knoppen hierboven."
                />
              ) : (
                <div>
                  {exceptions.map((exception) => (
                    <ExceptionListItem
                      key={exception.id}
                      exception={exception}
                      shiftsMap={shiftsMap}
                      onEdit={handleEdit}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* Scroll fade indicator */}
            {exceptions.length > 5 && (
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none" />
            )}
          </div>
        </div>
      </div>

      {/* Exception Modal */}
      <ShiftExceptionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        locationId={locationId}
        shifts={shifts}
        editingException={editingException}
        defaultDate={defaultDate}
        defaultType={defaultType}
      />

      {/* Bulk Exception Modal */}
      <BulkExceptionModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        locationId={locationId}
        shifts={shifts}
      />
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Uitzondering verwijderen"
        description={
          exceptionToDelete
            ? `Weet je zeker dat je de uitzondering voor ${exceptionToDelete.exception_date} wilt verwijderen?`
            : ""
        }
        confirmLabel="Verwijderen"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />
    </NestoCard>
  );
}
