import { NestoCard } from "@/components/polar/NestoCard";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { TableRow } from "./TableRow";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, ChevronDown, ChevronUp, MoreVertical, Plus, Archive } from "lucide-react";
import { useUpdateArea, useArchiveArea, useSwapAreaSortOrder } from "@/hooks/useTableMutations";
import type { AreaWithTables, Table, FillOrderType } from "@/types/reservations";
import { useState } from "react";

export interface AreaCardProps {
  area: AreaWithTables;
  allAreas: AreaWithTables[];
  index: number;
  onEdit: () => void;
  onAddTable: () => void;
  onAddBulkTables: () => void;
  onEditTable: (table: Table) => void;
  onRestoreTable: (table: Table, areaIsArchived: boolean) => void;
  /** Controlled expanded state from parent */
  isExpanded?: boolean;
  /** Callback when expand toggle is clicked */
  onToggleExpanded?: () => void;
  /** Optional drag handle element */
  dragHandle?: React.ReactNode;
  /** Location ID for swap mutations */
  locationId?: string;
}

const fillOrderOptions = [
  { value: 'first_available', label: 'Eerst beschikbaar' },
  { value: 'round_robin', label: 'Afwisselend' },
  { value: 'priority', label: 'Prioriteit' },
  { value: 'custom', label: 'Handmatig' },
];

export function AreaCard({
  area,
  allAreas,
  index,
  onEdit,
  onAddTable,
  onAddBulkTables,
  onEditTable,
  onRestoreTable,
  isExpanded: controlledIsExpanded,
  onToggleExpanded,
  dragHandle,
  locationId,
}: AreaCardProps) {
  // Support both controlled and uncontrolled modes
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const isOpen = controlledIsExpanded ?? internalIsOpen;
  const handleToggle = onToggleExpanded ?? (() => setInternalIsOpen(!internalIsOpen));
  
  const [archivedTablesOpen, setArchivedTablesOpen] = useState(false);
  
  const { mutate: updateArea } = useUpdateArea();
  const { mutate: archiveArea, isPending: isArchiving } = useArchiveArea();
  const { mutate: swapOrder, isPending: isSwapping } = useSwapAreaSortOrder();

  // Split tables
  const activeTables = (area.tables ?? [])
    .filter(t => t.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const archivedTables = (area.tables ?? []).filter(t => !t.is_active);

  // Calculate position for up/down
  const canMoveUp = index > 0;
  const canMoveDown = index < allAreas.length - 1;

  const handleMoveUp = () => {
    if (!canMoveUp || isSwapping) return;
    const prevArea = allAreas[index - 1];
    swapOrder({ areaAId: area.id, areaBId: prevArea.id, locationId: locationId ?? area.location_id });
  };

  const handleMoveDown = () => {
    if (!canMoveDown || isSwapping) return;
    const nextArea = allAreas[index + 1];
    swapOrder({ areaAId: area.id, areaBId: nextArea.id, locationId: locationId ?? area.location_id });
  };

  const handleFillOrderChange = (value: string) => {
    updateArea({ id: area.id, fill_order: value as FillOrderType });
  };

  const handleArchive = () => {
    archiveArea(area.id);
  };

  return (
    <NestoCard className="overflow-hidden">
      {/* Header */}
      <Collapsible open={isOpen} onOpenChange={handleToggle}>
        <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
          {/* Drag handle (if provided) */}
          {dragHandle}
          
          {/* Up/Down buttons */}
          <div className="flex flex-col gap-0.5">
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

          {/* Collapse trigger */}
          <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
            <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            <span className="font-medium">{area.name}</span>
            <span className="text-sm text-muted-foreground">
              ({activeTables.length} {activeTables.length === 1 ? 'tafel' : 'tafels'})
            </span>
          </CollapsibleTrigger>

          {/* Fill order */}
          <div className="w-36">
            <NestoSelect
              value={area.fill_order}
              onValueChange={handleFillOrderChange}
              options={fillOrderOptions}
            />
          </div>

          {/* Context menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <NestoButton variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </NestoButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Bewerken</DropdownMenuItem>
              <DropdownMenuItem onClick={onAddTable}>
                <Plus className="h-4 w-4 mr-2" />
                Tafel toevoegen
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddBulkTables}>
                <Plus className="h-4 w-4 mr-2" />
                Meerdere tafels toevoegen
              </DropdownMenuItem>
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

        {/* Content */}
        <CollapsibleContent>
          <div className="p-4 space-y-2">
            {/* Active Tables */}
            {activeTables.map((table, tableIndex) => (
              <TableRow
                key={table.id}
                table={table}
                allTables={activeTables}
                index={tableIndex}
                onEdit={() => onEditTable(table)}
                locationId={locationId ?? area.location_id}
              />
            ))}
            
            {activeTables.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Nog geen tafels in deze area.
              </div>
            )}

            {/* Add table buttons */}
            <div className="flex gap-2 pt-2">
              <NestoButton variant="outline" size="sm" onClick={onAddTable}>
                <Plus className="h-3 w-3 mr-1" />
                Tafel
              </NestoButton>
              <NestoButton variant="outline" size="sm" onClick={onAddBulkTables}>
                <Plus className="h-3 w-3 mr-1" />
                Meerdere
              </NestoButton>
            </div>

            {/* Archived Tables */}
            {archivedTables.length > 0 && (
              <Collapsible open={archivedTablesOpen} onOpenChange={setArchivedTablesOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-4 border-t mt-4">
                  <ChevronRight className={`h-3 w-3 transition-transform ${archivedTablesOpen ? 'rotate-90' : ''}`} />
                  <Archive className="h-3 w-3" />
                  Gearchiveerde tafels ({archivedTables.length})
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1">
                  {archivedTables.map(table => (
                    <div
                      key={table.id}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                    >
                      <div>
                        <span>{table.display_label}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({table.min_capacity}-{table.max_capacity} pers)
                        </span>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <NestoButton
                              size="sm"
                              variant="ghost"
                              disabled={!area.is_active}
                              onClick={() => onRestoreTable(table, !area.is_active)}
                            >
                              Herstellen
                            </NestoButton>
                          </span>
                        </TooltipTrigger>
                        {!area.is_active && (
                          <TooltipContent>
                            Herstel eerst de area voordat je tafels kunt herstellen
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </NestoCard>
  );
}
