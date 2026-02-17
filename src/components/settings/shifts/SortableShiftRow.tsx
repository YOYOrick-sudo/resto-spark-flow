import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreVertical, Archive } from "lucide-react";
import { NestoButton } from "@/components/polar/NestoButton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/polar/ConfirmDialog";
import { cn } from "@/lib/utils";
import { DAY_LABELS, ALL_WEEKDAYS, type Shift } from "@/types/shifts";
import { useState } from "react";

interface SortableShiftRowProps {
  id: string;
  shift: Shift;
  /** 1-based priority position */
  priority: number;
  /** When true, DnD is hard-disabled */
  isDragDisabled: boolean;
  onEdit: () => void;
  onArchive: () => void;
  isArchiving: boolean;
}

export function SortableShiftRow({
  id,
  shift,
  priority,
  isDragDisabled,
  onEdit,
  onArchive,
  isArchiving,
}: SortableShiftRowProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isDragDisabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : "transform 200ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease",
    opacity: isDragging ? 0 : 1,
    visibility: isDragging ? "hidden" : "visible",
    zIndex: isDragging ? 10 : "auto",
  };

  // Format time: remove seconds
  const formatTime = (time: string) => time.slice(0, 5);

  // Format interval for display
  const formatInterval = (minutes: number) => (minutes === 60 ? "1 uur" : `${minutes} min`);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="relative grid grid-cols-[32px_40px_100px_1fr_200px_80px_32px] items-center gap-2 py-2.5 px-2 rounded-dropdown hover:bg-accent/40 transition-all duration-150 group"
      >
        {/* Subtle left color accent */}
        <div
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ backgroundColor: shift.color }}
        />

        {/* Drag handle */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                {...(isDragDisabled ? {} : { ...attributes, ...listeners })}
                className={cn(
                  "p-1 rounded transition-colors flex items-center justify-center",
                  isDragDisabled
                    ? "opacity-30 cursor-not-allowed"
                    : "cursor-grab active:cursor-grabbing hover:bg-muted touch-none"
                )}
                aria-label="Versleep om te herschikken"
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            {isDragDisabled && (
              <TooltipContent side="right" className="max-w-[200px]">
                Slepen is altijd beschikbaar (gesorteerd op prioriteit)
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {/* Priority badge */}
        <div className="flex items-center justify-center">
          <span className="w-6 h-6 text-caption tabular-nums text-muted-foreground flex items-center justify-center rounded-md bg-muted border border-border/60">
            {priority}
          </span>
        </div>

        {/* Times */}
        <span className="text-sm tabular-nums font-semibold text-foreground">
          {formatTime(shift.start_time)}
          <span className="text-muted-foreground/60 mx-0.5">–</span>
          {formatTime(shift.end_time)}
        </span>

        {/* Name + color dot + short name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-3 h-3 rounded-full shrink-0 ring-2 ring-background shadow-sm"
            style={{ backgroundColor: shift.color }}
          />
          <span className="font-semibold text-sm truncate">{shift.name}</span>
          <span className="text-caption text-muted-foreground bg-muted px-2 py-0.5 rounded-control shrink-0">
            {shift.short_name}
          </span>
        </div>

        {/* Days */}
        <div className="flex gap-1">
          {ALL_WEEKDAYS.map((day) => (
            <span
              key={day}
              className={cn(
                "px-1.5 py-0.5 flex items-center justify-center text-caption rounded-control transition-colors",
                shift.days_of_week.includes(day)
                  ? "bg-primary/15 text-primary font-bold"
                  : "text-muted-foreground/40"
              )}
            >
              {DAY_LABELS[day]}
            </span>
          ))}
        </div>

        {/* Interval */}
        <span className="text-xs text-foreground/70 text-center font-medium tabular-nums">
          {formatInterval(shift.arrival_interval_minutes)}
        </span>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <NestoButton
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </NestoButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Bewerken</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setConfirmOpen(true)}
              disabled={isArchiving}
              className="text-destructive focus:text-destructive"
            >
              <Archive className="h-4 w-4 mr-2" />
              Archiveren
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Archive confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Shift archiveren"
        description={`Weet je zeker dat je "${shift.name}" wilt archiveren? Je kunt de shift later weer herstellen.`}
        confirmLabel="Archiveren"
        onConfirm={onArchive}
        variant="destructive"
      />
    </>
  );
}
