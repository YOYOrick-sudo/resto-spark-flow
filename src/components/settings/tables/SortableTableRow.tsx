import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreVertical, Archive, Globe } from "lucide-react";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoBadge } from "@/components/polar/NestoBadge";
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
    // SMOOTH: hide original completely during drag, but keep space
    opacity: isDragging ? 0 : 1,
    visibility: isDragging ? 'hidden' : 'visible',
    zIndex: isDragging ? 10 : 'auto',
  };

  const handleArchive = () => {
    archiveTable({ tableId: table.id, locationId });
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
      {/* Drag handle - hover only */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none transition-colors"
        aria-label="Versleep om te herschikken"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </button>

      {/* Table info */}
      <div className="flex-1 flex items-center gap-3">
        <span className="font-medium text-sm min-w-24">{table.display_label}</span>
        <span className="text-xs text-muted-foreground">
          {table.min_capacity}-{table.max_capacity} pers
        </span>
        
        {/* Online status */}
        {table.is_online_bookable && (
          <NestoBadge variant="outline" className="text-xs gap-1">
            <Globe className="h-3 w-3" />
            Online
          </NestoBadge>
        )}
        
        {/* Group count */}
        {table.group_count !== undefined && table.group_count > 0 && (
          <NestoBadge variant="default" className="text-xs">
            In {table.group_count} {table.group_count === 1 ? 'groep' : 'groepen'}
          </NestoBadge>
        )}
        
        {/* Not joinable indicator */}
        {!table.is_joinable && (
          <NestoBadge variant="outline" className="text-xs text-muted-foreground">
            Niet koppelbaar
          </NestoBadge>
        )}
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <NestoButton variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
