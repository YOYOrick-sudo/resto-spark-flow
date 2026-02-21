import { useState, useMemo } from "react";
import { NestoButton } from "@/components/polar/NestoButton";
import { NestoCard } from "@/components/polar/NestoCard";
import { FieldHelp } from "@/components/polar/FieldHelp";
import { TableGroupCard } from "./TableGroupCard";
import { TableGroupModal } from "./TableGroupModal";
import { useTableGroups, useRestoreTableGroup } from "@/hooks/useTableGroups";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, Plus, Loader2, Archive } from "lucide-react";
import type { TableGroup } from "@/types/reservations";

interface TableGroupsSectionProps {
  locationId: string | undefined;
}

export function TableGroupsSection({ locationId }: TableGroupsSectionProps) {
  const { data: allGroups, isLoading } = useTableGroups(locationId, { 
    includeInactive: true,
    includeMembers: true 
  });
  const { mutate: restoreGroup, isPending: isRestoring } = useRestoreTableGroup();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TableGroup | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);

  // Split active and archived, exclude system-generated
  const activeGroups = useMemo(
    () => allGroups?.filter(g => g.is_active && !g.is_system_generated) ?? [],
    [allGroups]
  );
  const archivedGroups = useMemo(
    () => allGroups?.filter(g => !g.is_active && !g.is_system_generated) ?? [],
    [allGroups]
  );

  const handleAdd = () => {
    setEditingGroup(null);
    setModalOpen(true);
  };

  const handleEdit = (group: TableGroup) => {
    setEditingGroup(group);
    setModalOpen(true);
  };

  const handleRestore = (group: TableGroup) => {
    restoreGroup({ groupId: group.id, locationId: group.location_id });
  };

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
          <div className="flex items-center gap-1.5">
            <h3 className="text-lg font-medium">Tafelcombinaties</h3>
            <FieldHelp>
              <p className="text-muted-foreground">Combineer tafels zodat het systeem ze automatisch kan samenvoegen voor grotere gezelschappen.</p>
            </FieldHelp>
          </div>
          <p className="text-sm text-muted-foreground">
            Groepeer tafels die samen geboekt kunnen worden.
          </p>
        </div>
        <NestoButton onClick={handleAdd} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nieuwe Groep
        </NestoButton>
      </div>

      {/* Active Groups */}
      <div className="grid gap-3">
        {activeGroups.map(group => (
          <TableGroupCard
            key={group.id}
            group={group}
            onEdit={() => handleEdit(group)}
          />
        ))}
        {activeGroups.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <p>Nog geen tafelcombinaties aangemaakt.</p>
            <NestoButton variant="outline" size="sm" className="mt-2" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Eerste groep toevoegen
            </NestoButton>
          </div>
        )}
      </div>

      {/* Archived Groups */}
      {archivedGroups.length > 0 && (
        <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen} className="mt-4">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
            <ChevronRight className={`h-4 w-4 transition-transform ${archivedOpen ? 'rotate-90' : ''}`} />
            <Archive className="h-4 w-4" />
            Gearchiveerd ({archivedGroups.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {archivedGroups.map(group => (
              <div
                key={group.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <span className="text-sm font-medium">{group.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({group.members?.length ?? 0} tafels)
                  </span>
                </div>
                <NestoButton
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRestore(group)}
                  disabled={isRestoring}
                >
                  Herstellen
                </NestoButton>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Modal */}
      <TableGroupModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        locationId={locationId}
        editingGroup={editingGroup}
      />
    </NestoCard>
  );
}
