import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreVertical, Archive } from "lucide-react";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useArchiveTable, useUpdateTable } from "@/hooks/useTableMutations";
import { cn } from "@/lib/utils";
import type { Table } from "@/types/reservations";

interface SortableTableRowProps {
  id: string;
  table: Table;
  /** 1-based priority position derived from sort_order */
  priority: number;
  /** When true, DnD is hard-disabled (not just visual) */
  isDragDisabled: boolean;
  onEdit: () => void;
  locationId: string;
}

export function SortableTableRow({ id, table, priority, isDragDisabled, onEdit, locationId }: SortableTableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id,
    disabled: isDragDisabled // Hard disable DnD
  });
  const { mutate: archiveTable, isPending: isArchiving } = useArchiveTable();
  const { mutate: updateTable, isPending: isUpdating } = useUpdateTable();

  const handleToggleOnline = (checked: boolean) => {
    updateTable({ 
      id: table.id, 
      is_online_bookable: checked 
    });
  };

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease',
    opacity: isDragging ? 0 : 1,
    visibility: isDragging ? 'hidden' : 'visible',
    zIndex: isDragging ? 10 : 'auto',
  };

  const handleArchive = () => {
    archiveTable({ tableId: table.id, locationId });
  };

  const groupCount = table.group_count ?? 0;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="grid grid-cols-[32px_40px_1fr_80px_80px_40px_48px_32px] items-center gap-2 py-2 px-1 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      {/* Drag handle with tooltip when disabled */}
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
              Sleepvolgorde bewerken kan alleen in Prioriteit sortering
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* Priority - read-only display */}
      <div className="flex items-center justify-center">
        <span className="w-8 h-6 text-sm text-center tabular-nums text-muted-foreground flex items-center justify-center">
          {priority}
        </span>
      </div>

      {/* Naam */}
      <span className="font-medium text-sm truncate">{table.display_label}</span>

      {/* Min capacity */}
      <span className="text-xs text-muted-foreground text-center">
        {table.min_capacity}
      </span>

      {/* Max capacity */}
      <span className="text-xs text-muted-foreground text-center">
        {table.max_capacity}
      </span>

      {/* Online toggle */}
      <div className="flex items-center justify-center">
        <Switch
          checked={table.is_online_bookable}
          onCheckedChange={handleToggleOnline}
          disabled={isUpdating}
          className="h-[18px] w-[32px] [&>span]:h-[12px] [&>span]:w-[12px] [&>span]:data-[state=checked]:translate-x-[15px] [&>span]:data-[state=unchecked]:translate-x-[1px] data-[state=checked]:bg-success"
          aria-label="Online boekbaar"
        />
      </div>

      {/* Groups */}
      <div className="flex items-center justify-center">
        {groupCount > 0 ? (
          <NestoBadge variant="default" className="text-xs px-2 py-0.5">
            {groupCount}
          </NestoBadge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

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
            onClick={handleArchive}
            disabled={isArchiving}
            className="text-destructive focus:text-destructive"
          >
            <Archive className="h-4 w-4 mr-2" />
            Archiveren
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
