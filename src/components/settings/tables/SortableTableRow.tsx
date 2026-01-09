import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreVertical, Archive } from "lucide-react";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { StatusDot } from "@/components/polar/StatusDot";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useArchiveTable } from "@/hooks/useTableMutations";
import type { Table } from "@/types/reservations";

interface SortableTableRowProps {
  id: string;
  table: Table;
  onEdit: () => void;
  locationId: string;
}

export function SortableTableRow({ id, table, onEdit, locationId }: SortableTableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const { mutate: archiveTable, isPending: isArchiving } = useArchiveTable();

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
      className="grid grid-cols-[32px_1fr_80px_40px_80px_32px] items-center gap-2 py-2 px-1 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none transition-colors flex items-center justify-center"
        aria-label="Versleep om te herschikken"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {/* Naam */}
      <span className="font-medium text-sm truncate">{table.display_label}</span>

      {/* Capacity */}
      <span className="text-xs text-muted-foreground text-center">
        {table.min_capacity}-{table.max_capacity} pers
      </span>

      {/* Online status dot */}
      <div className="flex items-center justify-center">
        <StatusDot 
          status={table.is_online_bookable ? "success" : "neutral"} 
          size="md"
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
