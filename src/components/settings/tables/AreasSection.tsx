import { useState, useMemo, useCallback, useEffect } from "react";
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
import { NestoCard } from "@/components/polar/NestoCard";
import { SortableAreaCard } from "./SortableAreaCard";
import { AreaModal } from "./AreaModal";
import { TableModal } from "./TableModal";
import { BulkTableModal } from "./BulkTableModal";
import { RestoreTableModal } from "./RestoreTableModal";
import { useAreasForSettings } from "@/hooks/useAreasWithTables";
import { useRestoreArea, useReorderAreas } from "@/hooks/useTableMutations";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, Plus, Loader2, Archive, GripVertical } from "lucide-react";
import type { Area, Table, AreaWithTables } from "@/types/reservations";

interface AreasSectionProps {
  locationId: string | undefined;
}

export function AreasSection({ locationId }: AreasSectionProps) {
  const { data: allAreas, isLoading } = useAreasForSettings(locationId);
  const { mutate: restoreArea, isPending: isRestoring } = useRestoreArea();
  const { mutate: reorderAreas } = useReorderAreas();
  
  // Modals state
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [tableModalAreaId, setTableModalAreaId] = useState<string | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [restoreTableModalOpen, setRestoreTableModalOpen] = useState(false);
  const [restoringTable, setRestoringTable] = useState<Table | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);

  // DnD state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedAreaIds, setExpandedAreaIds] = useState<Set<string>>(new Set());

  // Split active and archived areas
  const activeAreas = useMemo(
    () => allAreas?.filter(a => a.is_active).sort((a, b) => a.sort_order - b.sort_order) ?? [],
    [allAreas]
  );
  const archivedAreas = useMemo(
    () => allAreas?.filter(a => !a.is_active) ?? [],
    [allAreas]
  );

  // Collect ALL archived tables across ALL areas (including archived areas)
  const allArchivedTables = useMemo(() => {
    if (!allAreas) return [];
    const tables: Array<Table & { areaName: string; areaIsArchived: boolean }> = [];
    for (const area of allAreas) {
      const archivedInArea = (area.tables ?? []).filter(t => !t.is_active);
      for (const table of archivedInArea) {
        tables.push({
          ...table,
          areaName: area.name,
          areaIsArchived: !area.is_active,
        });
      }
    }
    return tables;
  }, [allAreas]);

  // Active dragging area for overlay
  const activeArea = useMemo(
    () => activeAreas.find(a => a.id === activeId),
    [activeAreas, activeId]
  );

  // Initialize expanded state: expand first area by default, prune stale IDs
  useEffect(() => {
    if (activeAreas.length === 0) return;
    
    const validIds = new Set(activeAreas.map(a => a.id));
    
    setExpandedAreaIds(prev => {
      // Prune stale IDs
      const pruned = new Set([...prev].filter(id => validIds.has(id)));
      
      // If nothing expanded, expand first
      if (pruned.size === 0 && activeAreas.length > 0) {
        pruned.add(activeAreas[0].id);
      }
      
      return pruned;
    });
  }, [activeAreas]);

  // DnD sensors - optimized for smooth input
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Toggle expanded state for an area
  const toggleAreaExpanded = useCallback((areaId: string) => {
    setExpandedAreaIds(prev => {
      const next = new Set(prev);
      if (next.has(areaId)) {
        next.delete(areaId);
      } else {
        next.add(areaId);
      }
      return next;
    });
  }, []);

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id || !locationId) return;

    const oldIndex = activeAreas.findIndex(a => a.id === active.id);
    const newIndex = activeAreas.findIndex(a => a.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(activeAreas, oldIndex, newIndex);
    const areaIds = newOrder.map(a => a.id);

    reorderAreas({ locationId, areaIds });
  }, [activeAreas, locationId, reorderAreas]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // Handlers
  const handleAddArea = () => {
    setEditingArea(null);
    setAreaModalOpen(true);
  };

  const handleEditArea = (area: Area) => {
    setEditingArea(area);
    setAreaModalOpen(true);
  };

  const handleAddTable = (areaId: string) => {
    setEditingTable(null);
    setTableModalAreaId(areaId);
    setTableModalOpen(true);
  };

  const handleAddBulkTables = (areaId: string) => {
    setTableModalAreaId(areaId);
    setBulkModalOpen(true);
  };

  const handleEditTable = (table: Table) => {
    setEditingTable(table);
    setTableModalAreaId(table.area_id);
    setTableModalOpen(true);
  };

  const handleRestoreTable = (table: Table) => {
    setRestoringTable(table);
    setRestoreTableModalOpen(true);
  };

  const handleRestoreArea = (areaId: string) => {
    restoreArea(areaId);
  };

  // Check if any archived content exists
  const hasArchivedContent = archivedAreas.length > 0 || allArchivedTables.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <NestoCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium">Areas</h3>
          <p className="text-sm text-muted-foreground">
            Beheer ruimtes en de tafels daarin.
          </p>
        </div>
        <NestoButton onClick={handleAddArea} size="sm" disabled={!locationId}>
          <Plus className="h-4 w-4 mr-1" />
          Nieuwe Area
        </NestoButton>
      </div>

      {/* Active Areas with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={activeAreas.map(a => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {activeAreas.map((area, index) => (
              <SortableAreaCard
                key={area.id}
                id={area.id}
                area={area}
                allAreas={activeAreas}
                index={index}
                onEdit={() => handleEditArea(area)}
                onAddTable={() => handleAddTable(area.id)}
                onAddBulkTables={() => handleAddBulkTables(area.id)}
                onEditTable={handleEditTable}
                isExpanded={expandedAreaIds.has(area.id)}
                onToggleExpanded={() => toggleAreaExpanded(area.id)}
                locationId={locationId}
              />
            ))}
            {activeAreas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                <p>Nog geen areas aangemaakt.</p>
                <NestoButton variant="outline" size="sm" className="mt-2" onClick={handleAddArea}>
                  <Plus className="h-4 w-4 mr-1" />
                  Eerste area toevoegen
                </NestoButton>
              </div>
            )}
          </div>
        </SortableContext>

        {/* DragOverlay - matches collapsed AreaCard header */}
        <DragOverlay dropAnimation={null}>
          {activeArea && (
            <div
              className="bg-card border rounded-card shadow-lg ring-1 ring-primary/20 overflow-hidden pointer-events-none select-none"
              style={{ willChange: 'transform' }}
            >
              {/* Match AreaCard header exactly */}
              <div className="flex items-center gap-2 p-4 bg-muted/30">
                <button className="cursor-grabbing p-1 hover:bg-muted rounded">
                  <GripVertical className="h-4 w-4 text-primary" />
                </button>
                <div className="flex items-center gap-2 flex-1">
                  <ChevronRight className="h-4 w-4" />
                  <span className="font-medium">{activeArea.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({activeArea.tables?.filter(t => t.is_active).length ?? 0} tafels)
                  </span>
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Centralized Archived Section */}
      {hasArchivedContent && (
        <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen} className="mt-4">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
            <ChevronRight className={`h-4 w-4 transition-transform ${archivedOpen ? 'rotate-90' : ''}`} />
            <Archive className="h-4 w-4" />
            Gearchiveerd ({archivedAreas.length} areas, {allArchivedTables.length} tafels)
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-4">
            {/* Archived Areas */}
            {archivedAreas.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Areas</h4>
                {archivedAreas.map(area => (
                  <div
                    key={area.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <span className="text-sm font-medium">{area.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({area.tables?.length ?? 0} tafels)
                      </span>
                    </div>
                    <NestoButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRestoreArea(area.id)}
                      disabled={isRestoring}
                    >
                      Herstellen
                    </NestoButton>
                  </div>
                ))}
              </div>
            )}

            {/* Archived Tables */}
            {allArchivedTables.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tafels</h4>
                {allArchivedTables.map(table => (
                  <div
                    key={table.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <span className="text-sm font-medium">{table.display_label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({table.min_capacity}-{table.max_capacity} pers · {table.areaName})
                      </span>
                    </div>
                    <NestoButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRestoreTable(table)}
                      disabled={table.areaIsArchived}
                      title={table.areaIsArchived ? "Herstel eerst de area" : undefined}
                    >
                      Herstellen
                    </NestoButton>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Modals */}
      <AreaModal
        open={areaModalOpen}
        onOpenChange={setAreaModalOpen}
        locationId={locationId}
        editingArea={editingArea}
      />
      
      {tableModalAreaId && (
        <TableModal
          open={tableModalOpen}
          onOpenChange={setTableModalOpen}
          areaId={tableModalAreaId}
          editingTable={editingTable}
        />
      )}
      
      {tableModalAreaId && (
        <BulkTableModal
          open={bulkModalOpen}
          onOpenChange={setBulkModalOpen}
          areaId={tableModalAreaId}
        />
      )}
      
      {restoringTable && (
        <RestoreTableModal
          open={restoreTableModalOpen}
          onOpenChange={setRestoreTableModalOpen}
          table={restoringTable}
        />
      )}
    </NestoCard>
  );
}
