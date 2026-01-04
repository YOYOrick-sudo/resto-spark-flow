import { NestoButton } from "@/components/polar/NestoButton";
import { NestoBadge } from "@/components/polar/NestoBadge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronUp, ChevronDown, MoreVertical, Archive, Globe } from "lucide-react";
import { useArchiveTable, useSwapTableSortOrder } from "@/hooks/useTableMutations";
import type { Table } from "@/types/reservations";

interface TableRowProps {
  table: Table;
  allTables: Table[];
  index: number;
  onEdit: () => void;
}

export function TableRow({ table, allTables, index, onEdit }: TableRowProps) {
  const { mutate: archiveTable, isPending: isArchiving } = useArchiveTable();
  const { mutate: swapOrder, isPending: isSwapping } = useSwapTableSortOrder();

  const canMoveUp = index > 0;
  const canMoveDown = index < allTables.length - 1;

  const handleMoveUp = () => {
    if (!canMoveUp || isSwapping) return;
    const prevTable = allTables[index - 1];
    swapOrder({ tableAId: table.id, tableBId: prevTable.id });
  };

  const handleMoveDown = () => {
    if (!canMoveDown || isSwapping) return;
    const nextTable = allTables[index + 1];
    swapOrder({ tableAId: table.id, tableBId: nextTable.id });
  };

  const handleArchive = () => {
    archiveTable(table.id);
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group">
      {/* Up/Down buttons */}
      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleMoveUp}
          disabled={!canMoveUp || isSwapping}
          className="p-0.5 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          onClick={handleMoveDown}
          disabled={!canMoveDown || isSwapping}
          className="p-0.5 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

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
