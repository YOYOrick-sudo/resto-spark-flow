import { useState, useMemo } from "react";
import { NestoButton } from "@/components/polar/NestoButton";
import { AreaCard } from "./AreaCard";
import { AreaModal } from "./AreaModal";
import { TableModal } from "./TableModal";
import { BulkTableModal } from "./BulkTableModal";
import { RestoreTableModal } from "./RestoreTableModal";
import { useAreasForSettings } from "@/hooks/useAreasWithTables";
import { useRestoreArea } from "@/hooks/useTableMutations";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, Plus, Loader2, Archive } from "lucide-react";
import type { Area, Table } from "@/types/reservations";

interface AreasSectionProps {
  locationId: string | undefined;
}

export function AreasSection({ locationId }: AreasSectionProps) {
  const { data: allAreas, isLoading } = useAreasForSettings(locationId);
  const { mutate: restoreArea, isPending: isRestoring } = useRestoreArea();
  
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

  // Split active and archived client-side
  const activeAreas = useMemo(
    () => allAreas?.filter(a => a.is_active).sort((a, b) => a.sort_order - b.sort_order) ?? [],
    [allAreas]
  );
  const archivedAreas = useMemo(
    () => allAreas?.filter(a => !a.is_active) ?? [],
    [allAreas]
  );

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

  const handleRestoreTable = (table: Table, areaIsArchived: boolean) => {
    if (areaIsArchived) return; // Blocked in UI
    setRestoringTable(table);
    setRestoreTableModalOpen(true);
  };

  const handleRestoreArea = (areaId: string) => {
    restoreArea(areaId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Areas</h3>
          <p className="text-sm text-muted-foreground">
            Beheer ruimtes en de tafels daarin.
          </p>
        </div>
        <NestoButton onClick={handleAddArea} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nieuwe Area
        </NestoButton>
      </div>

      {/* Active Areas */}
      <div className="space-y-3">
        {activeAreas.map((area, index) => (
          <AreaCard
            key={area.id}
            area={area}
            allAreas={activeAreas}
            index={index}
            onEdit={() => handleEditArea(area)}
            onAddTable={() => handleAddTable(area.id)}
            onAddBulkTables={() => handleAddBulkTables(area.id)}
            onEditTable={handleEditTable}
            onRestoreTable={(table, areaArchived) => handleRestoreTable(table, areaArchived)}
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

      {/* Archived Areas */}
      {archivedAreas.length > 0 && (
        <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
            <ChevronRight className={`h-4 w-4 transition-transform ${archivedOpen ? 'rotate-90' : ''}`} />
            <Archive className="h-4 w-4" />
            Gearchiveerd ({archivedAreas.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
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
    </div>
  );
}
