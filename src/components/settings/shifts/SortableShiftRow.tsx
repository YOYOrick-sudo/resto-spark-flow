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
        className="grid grid-cols-[32px_40px_100px_1fr_140px_80px_32px] items-center gap-2 py-2 px-1 rounded-dropdown hover:bg-accent/50 transition-colors group"
      >
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

        {/* Priority */}
        <div className="flex items-center justify-center">
          <span className="w-8 h-6 text-sm text-center tabular-nums text-muted-foreground flex items-center justify-center">
            {priority}
          </span>
        </div>

        {/* Times */}
        <span className="text-sm tabular-nums">
          {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
        </span>

        {/* Name + color dot + short name */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: shift.color }}
          />
          <span className="font-medium text-sm truncate">{shift.name}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
            {shift.short_name}
          </span>
        </div>

        {/* Days */}
        <div className="flex gap-0.5">
          {ALL_WEEKDAYS.map((day) => (
            <span
              key={day}
              className={cn(
                "px-1 py-0.5 text-[10px] rounded font-medium",
                shift.days_of_week.includes(day)
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/50 text-muted-foreground"
              )}
            >
              {DAY_LABELS[day]}
            </span>
          ))}
        </div>

        {/* Interval */}
        <span className="text-xs text-muted-foreground text-center">
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
