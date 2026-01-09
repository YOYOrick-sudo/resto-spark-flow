import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { NestoCard } from "@/components/polar/NestoCard";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoSelect } from "@/components/polar/NestoSelect";
import { SortableTableRow } from "./SortableTableRow";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronRight, ChevronUp, MoreVertical, Plus, Archive, GripVertical } from "lucide-react";
import { useUpdateArea, useArchiveArea, useReorderTables } from "@/hooks/useTableMutations";
import { cn } from "@/lib/utils";
import type { AreaWithTables, Table, FillOrderType } from "@/types/reservations";

export interface AreaCardProps {
  area: AreaWithTables;
  allAreas: AreaWithTables[];
  index: number;
  onEdit: () => void;
  onAddTable: () => void;
  onAddBulkTables: () => void;
  onEditTable: (table: Table) => void;
  /** Controlled expanded state from parent */
  isExpanded?: boolean;
  /** Callback when expand toggle is clicked */
  onToggleExpanded?: () => void;
  /** Optional drag handle element */
  dragHandle?: React.ReactNode;
  /** Location ID for mutations */
  locationId?: string;
}

const fillOrderOptions = [
  { value: 'first_available', label: 'Eerst beschikbaar' },
  { value: 'round_robin', label: 'Afwisselend' },
  { value: 'priority', label: 'Prioriteit' },
  { value: 'custom', label: 'Handmatig' },
];

type SortColumn = 'priority' | 'name' | 'min' | 'max' | 'online';
type SortDirection = 'asc' | 'desc';

export function AreaCard({
  area,
  allAreas,
  index,
  onEdit,
  onAddTable,
  onAddBulkTables,
  onEditTable,
  isExpanded: controlledIsExpanded,
  onToggleExpanded,
  dragHandle,
  locationId,
}: AreaCardProps) {
  // Support both controlled and uncontrolled modes
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const isOpen = controlledIsExpanded ?? internalIsOpen;
  const handleToggle = onToggleExpanded ?? (() => setInternalIsOpen(!internalIsOpen));
  
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  const { mutate: updateArea } = useUpdateArea();
  const { mutate: archiveArea, isPending: isArchiving } = useArchiveArea();
  const { mutate: reorderTables } = useReorderTables();

  // Only active tables (archived tables moved to parent)
  const activeTables = useMemo(() => 
    (area.tables ?? []).filter(t => t.is_active),
    [area.tables]
  );

  // orderedByPrio - always sorted by sort_order (source of truth for priority)
  const orderedByPrio = useMemo(() => 
    [...activeTables].sort(
      (a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id)
    ),
    [activeTables]
  );

  // priorityMap - O(1) lookup, built on orderedByPrio
  const priorityMap = useMemo(() => {
    const map = new Map<string, number>();
    orderedByPrio.forEach((table, idx) => {
      map.set(table.id, idx + 1); // 1-based
    });
    return map;
  }, [orderedByPrio]);

  // sortedTables - with stable tiebreakers
  const sortedTables = useMemo(() => {
    const sorted = [...activeTables];
    
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortColumn) {
        case 'priority':
          cmp = a.sort_order - b.sort_order;
          break;
        case 'name':
          cmp = a.display_label.localeCompare(b.display_label);
          break;
        case 'min':
          cmp = a.min_capacity - b.min_capacity;
          break;
        case 'max':
          cmp = a.max_capacity - b.max_capacity;
          break;
        case 'online':
          cmp = Number(b.is_online_bookable) - Number(a.is_online_bookable);
          break;
      }
      
      // Stable tiebreaker: sort_order, then id
      if (cmp === 0) cmp = a.sort_order - b.sort_order;
      if (cmp === 0) cmp = a.id.localeCompare(b.id);
      
      return sortDirection === 'desc' ? -cmp : cmp;
    });
    
    return sorted;
  }, [activeTables, sortColumn, sortDirection]);

  // DnD is only enabled when sorted by priority ascending
  const isDragEnabled = sortColumn === 'priority' && sortDirection === 'asc';
  
  // Use orderedByPrio for DnD, sortedTables otherwise
  const dndItems = isDragEnabled ? orderedByPrio : sortedTables;
  
  // Calculate total capacity for summary
  const totalCapacity = useMemo(() => 
    activeTables.reduce((sum, t) => sum + t.max_capacity, 0),
    [activeTables]
  );
  
  const activeTable = activeTables.find(t => t.id === activeTableId);
  const effectiveLocationId = locationId ?? area.location_id;

  // Sensors for tables DnD
  const tableSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleFillOrderChange = (value: string) => {
    updateArea({ id: area.id, fill_order: value as FillOrderType });
  };

  const handleArchive = () => {
    archiveArea(area.id);
  };

  const handleTableDragStart = (event: DragStartEvent) => {
    setActiveTableId(event.active.id as string);
  };

  const handleTableDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTableId(null);
    
    // Guard: only reorder when DnD is enabled (priority asc)
    if (!isDragEnabled) return;
    
    if (!over || active.id === over.id) return;

    const oldIndex = orderedByPrio.findIndex(t => t.id === active.id);
    const newIndex = orderedByPrio.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(orderedByPrio, oldIndex, newIndex);
    reorderTables({
      areaId: area.id,
      locationId: effectiveLocationId,
      tableIds: newOrder.map(t => t.id)
    });
  };

  const handleTableDragCancel = () => {
    setActiveTableId(null);
  };

  // Sortable header component
  const SortableHeader = ({ label, column, className }: { 
    label: string; 
    column: SortColumn; 
    className?: string;
  }) => (
    <button
      onClick={() => {
        if (sortColumn === column) {
          setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        } else {
          setSortColumn(column);
          setSortDirection('asc');
        }
      }}
      className={cn(
        "flex items-center gap-0.5 text-xs hover:text-foreground transition-colors",
        className
      )}
    >
      {label}
      {sortColumn === column && (
        <ChevronUp className={cn(
          "h-3 w-3 transition-transform",
          sortDirection === 'desc' && "rotate-180"
        )} />
      )}
    </button>
  );

  return (
    <NestoCard className="overflow-hidden">
      {/* Header */}
      <Collapsible open={isOpen} onOpenChange={handleToggle}>
        <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
          {/* Drag handle (if provided) */}
          {dragHandle}

          {/* Collapse trigger with enhanced summary */}
          <CollapsibleTrigger className="flex items-center gap-2 flex-1 text-left">
            <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            <span className="font-medium">{area.name}</span>
            <span className="text-sm text-muted-foreground">
              {isOpen 
                ? `(${activeTables.length} ${activeTables.length === 1 ? 'tafel' : 'tafels'})`
                : `${activeTables.length} tafels · ${totalCapacity} pers`
              }
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
            {/* Table header row with sortable columns */}
            {activeTables.length > 0 && (
              <div className="grid grid-cols-[32px_40px_40px_1fr_80px_80px_32px] items-center gap-2 px-1 pb-2 border-b text-xs text-muted-foreground">
                <div></div>
                <SortableHeader label="Prio" column="priority" className="justify-center" />
                <SortableHeader label="Online" column="online" className="justify-center" />
                <SortableHeader label="Naam" column="name" />
                <SortableHeader label="Min" column="min" className="justify-center" />
                <SortableHeader label="Max" column="max" className="justify-center" />
                <div></div>
              </div>
            )}

            {/* Active Tables with DnD */}
            <DndContext
              sensors={tableSensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragStart={handleTableDragStart}
              onDragEnd={handleTableDragEnd}
              onDragCancel={handleTableDragCancel}
            >
              <SortableContext items={dndItems.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {dndItems.map((table) => (
                  <SortableTableRow
                    key={table.id}
                    id={table.id}
                    table={table}
                    priority={priorityMap.get(table.id) ?? 0}
                    isDragDisabled={!isDragEnabled}
                    onEdit={() => onEditTable(table)}
                    locationId={effectiveLocationId}
                  />
                ))}
              </SortableContext>
              
              {/* Minimal DragOverlay - Notion-style */}
              <DragOverlay dropAnimation={null}>
                {activeTable && (
                  <div 
                    className="bg-card border rounded-lg px-4 py-2 shadow-lg ring-1 ring-primary/20 flex items-center gap-3"
                    style={{ willChange: 'transform' }}
                  >
                    <GripVertical className="h-3 w-3 text-primary" />
                    <span className="text-xs text-muted-foreground tabular-nums">{priorityMap.get(activeTable.id) ?? '—'}</span>
                    <span className="font-medium text-sm">{activeTable.display_label}</span>
                    <span className="text-xs text-muted-foreground">
                      {activeTable.min_capacity}-{activeTable.max_capacity} pers
                    </span>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
            
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
          </div>
        </CollapsibleContent>
      </Collapsible>
    </NestoCard>
  );
}