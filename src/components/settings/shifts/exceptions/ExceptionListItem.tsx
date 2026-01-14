import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { NestoButton } from "@/components/polar/NestoButton";
import { cn } from "@/lib/utils";
import type { ShiftException, ShiftExceptionType, Shift } from "@/types/shifts";

interface ExceptionListItemProps {
  exception: ShiftException;
  shiftsMap: Map<string, Shift>;
  onEdit: (exception: ShiftException) => void;
  onDelete: (exception: ShiftException) => void;
}

const TYPE_CONFIG: Record<ShiftExceptionType, { label: string; variant: "error" | "warning" | "default"; className?: string }> = {
  closed: { label: "Gesloten", variant: "error" },
  modified: { label: "Aangepast", variant: "warning" },
  special: { label: "Speciaal", variant: "default", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
};

export function ExceptionListItem({
  exception,
  shiftsMap,
  onEdit,
  onDelete,
}: ExceptionListItemProps) {
  const typeConfig = TYPE_CONFIG[exception.exception_type];
  const date = parseISO(exception.exception_date);
  const formattedDate = format(date, "d MMM", { locale: nl });

  // Determine scope label
  const scopeLabel = exception.shift_id
    ? shiftsMap.get(exception.shift_id)?.name || "Onbekende shift"
    : "Alle shifts";

  // Format times for modified type
  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.slice(0, 5); // "HH:MM:SS" → "HH:MM"
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0 group">
      {/* Left: Content area */}
      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden px-3">
        {/* Date */}
        <span className="text-sm font-medium w-16 flex-shrink-0">
          {formattedDate}
        </span>

        {/* Type badge */}
        <NestoBadge
          variant={typeConfig.variant === "default" ? undefined : typeConfig.variant}
          className={cn("text-xs flex-shrink-0", typeConfig.className)}
        >
          {typeConfig.label}
        </NestoBadge>

        {/* Scope */}
        <span className="text-sm text-muted-foreground truncate flex-shrink min-w-0">
          {scopeLabel}
        </span>

        {/* Times for modified */}
        {exception.exception_type === "modified" && exception.override_start_time && exception.override_end_time && (
          <span className="text-sm text-muted-foreground flex-shrink-0">
            {formatTime(exception.override_start_time)} - {formatTime(exception.override_end_time)}
          </span>
        )}

        {/* Label if present */}
        {exception.label && (
          <span className="text-sm font-medium truncate flex-shrink min-w-0">
            {exception.label}
          </span>
        )}
      </div>

      {/* Right: Actions - fixed width */}
      <div className="flex items-center gap-1 px-3 w-20 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <NestoButton
          variant="ghost"
          size="sm"
          onClick={() => onEdit(exception)}
          className="h-8 w-8 p-0"
        >
          <Pencil className="h-4 w-4" />
        </NestoButton>
        <NestoButton
          variant="ghost"
          size="sm"
          onClick={() => onDelete(exception)}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </NestoButton>
      </div>
    </div>
  );
}
