import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { NestoButton } from "@/components/polar/NestoButton";
import { SortableShiftRow } from "./SortableShiftRow";
import { ShiftWizard } from "./ShiftWizard";
import { useAllShifts, useArchiveShift, useRestoreShift, useReorderShifts } from "@/hooks/useShifts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, GripVertical, Loader2, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAY_LABELS, ALL_WEEKDAYS, type Shift } from "@/types/shifts";

interface ShiftsTableProps {
  locationId: string;
}

export function ShiftsTable({ locationId }: ShiftsTableProps) {
  const { data: allShifts = [], isLoading } = useAllShifts(locationId);
  const { mutate: archiveShift, isPending: isArchiving } = useArchiveShift();
  const { mutate: restoreShift, isPending: isRestoring } = useRestoreShift();
  const { mutate: reorderShifts } = useReorderShifts();

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);

  // Split active and archived shifts
  const activeShifts = useMemo(
    () => allShifts.filter((s) => s.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [allShifts]
  );
  const archivedShifts = useMemo(
    () => allShifts.filter((s) => !s.is_active),
    [allShifts]
  );

  // Active dragging shift for overlay
  const activeShift = useMemo(
    () => activeShifts.find((s) => s.id === activeId),
    [activeShifts, activeId]
  );

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      const oldIndex = activeShifts.findIndex((s) => s.id === active.id);
      const newIndex = activeShifts.findIndex((s) => s.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(activeShifts, oldIndex, newIndex);
      const shiftIds = newOrder.map((s) => s.id);

      reorderShifts({ locationId, shiftIds });
    },
    [activeShifts, locationId, reorderShifts]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // Handlers
  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setWizardOpen(true);
  };

  const handleArchive = (shiftId: string) => {
    archiveShift(shiftId);
  };

  const handleRestore = (shiftId: string) => {
    restoreShift(shiftId);
  };

  const handleOpenCreate = () => {
    setEditingShift(null);
    setWizardOpen(true);
  };

  // Format time for overlay
  const formatTime = (time: string) => time.slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table header */}
      <div className="grid grid-cols-[28px_32px_1fr_160px_60px_28px] items-center gap-1.5 px-2 pb-2 text-caption text-muted-foreground uppercase tracking-wider">
        <span></span>
        <span></span>
        <span>Shift</span>
        <span>Dagen</span>
        <span className="text-center">Interval</span>
        <span></span>
      </div>


      {/* Active shifts with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={activeShifts.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="divide-y divide-border/50">
            {activeShifts.map((shift, index) => (
              <SortableShiftRow
                key={shift.id}
                id={shift.id}
                shift={shift}
                priority={index + 1}
                isDragDisabled={false}
                onEdit={() => handleEdit(shift)}
                onArchive={() => handleArchive(shift.id)}
                isArchiving={isArchiving}
              />
            ))}
            {activeShifts.length === 0 && (
              <div className="text-center py-10 text-muted-foreground border border-dashed border-border/60 rounded-card bg-muted/20">
                <p className="text-sm">Nog geen shifts aangemaakt.</p>
                <NestoButton
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={handleOpenCreate}
                >
                  Eerste shift toevoegen
                </NestoButton>
              </div>
            )}
          </div>
        </SortableContext>

        {/* DragOverlay */}
        <DragOverlay dropAnimation={null}>
          {activeShift && (
            <div
              className="bg-card border border-border/60 rounded-dropdown shadow-lg ring-1 ring-primary/20 overflow-hidden pointer-events-none select-none px-3 py-2.5"
              style={{ willChange: "transform" }}
            >
              <div className="flex items-center gap-2.5">
                <GripVertical className="h-3.5 w-3.5 text-primary" />
                <span
                  className="w-3 h-3 rounded-full ring-2 ring-background"
                  style={{ backgroundColor: activeShift.color }}
                />
                <span className="font-semibold text-sm">{activeShift.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatTime(activeShift.start_time)} – {formatTime(activeShift.end_time)}
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Archived section */}
      {archivedShifts.length > 0 && (
        <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen} className="mt-4">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
            <ChevronRight
              className={cn("h-4 w-4 transition-transform", archivedOpen && "rotate-90")}
            />
            <Archive className="h-4 w-4" />
            Gearchiveerd ({archivedShifts.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-1.5">
            {archivedShifts.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-dropdown border border-border/30"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full opacity-50"
                    style={{ backgroundColor: shift.color }}
                  />
                  <span className="text-sm font-medium text-muted-foreground">{shift.name}</span>
                  <span className="text-xs text-muted-foreground/70 tabular-nums">
                    {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                  </span>
                  <div className="flex gap-1 ml-2">
                    {ALL_WEEKDAYS.map((day) => (
                      <span
                        key={day}
                        className={cn(
                          "px-1.5 py-0.5 text-caption rounded-control",
                          shift.days_of_week.includes(day)
                            ? "bg-muted-foreground/20 text-muted-foreground"
                            : "opacity-30"
                        )}
                      >
                        {DAY_LABELS[day]}
                      </span>
                    ))}
                  </div>
                </div>
                <NestoButton
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRestore(shift.id)}
                  disabled={isRestoring}
                >
                  Herstellen
                </NestoButton>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Wizard */}
      <ShiftWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        locationId={locationId}
        editingShift={editingShift}
      />
    </div>
  );
}
