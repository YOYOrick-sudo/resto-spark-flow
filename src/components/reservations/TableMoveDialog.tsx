import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoButton } from "@/components/polar/NestoButton";
import { Spinner } from "@/components/polar/LoadingStates";
import { useAreasWithTables } from "@/hooks/useAreasWithTables";
import { useMoveTable } from "@/hooks/useMoveTable";

interface TableMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
  currentTableId: string | null;
  locationId: string;
}

export function TableMoveDialog({
  open,
  onOpenChange,
  reservationId,
  currentTableId,
  locationId,
}: TableMoveDialogProps) {
  const { data: areas = [], isLoading } = useAreasWithTables(locationId);
  const moveTable = useMoveTable();
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const handleMove = () => {
    if (!selectedTableId) return;
    moveTable.mutate(
      { reservationId, newTableId: selectedTableId },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelectedTableId(null);
        },
      }
    );
  };

  const activeAreas = areas.filter(
    (a) => a.is_active && a.tables && a.tables.some((t) => t.is_active)
  );

  return (
    <NestoModal
      open={open}
      onOpenChange={onOpenChange}
      title="Tafel wijzigen"
      description="Selecteer een nieuwe tafel voor deze reservering."
      footer={
        <div className="flex justify-end gap-2">
          <NestoButton variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton
            onClick={handleMove}
            disabled={!selectedTableId || selectedTableId === currentTableId || moveTable.isPending}
          >
            {moveTable.isPending ? "Wijzigen..." : "Wijzigen"}
          </NestoButton>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {activeAreas.map((area) => (
            <div key={area.id}>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                {area.name}
              </h4>
              <div className="grid grid-cols-3 gap-1.5">
                {area.tables
                  ?.filter((t) => t.is_active)
                  .map((table) => {
                    const isCurrent = table.id === currentTableId;
                    const isSelected = table.id === selectedTableId;

                    return (
                      <button
                        key={table.id}
                        onClick={() => !isCurrent && setSelectedTableId(table.id)}
                        disabled={isCurrent}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors",
                          isCurrent
                            ? "border-primary bg-primary/10 text-primary cursor-default"
                            : isSelected
                              ? "border-primary bg-primary/5 ring-2 ring-primary"
                              : "border-input hover:bg-secondary"
                        )}
                      >
                        <span className="font-medium">{table.display_label}</span>
                        <span className="text-xs text-muted-foreground">
                          {table.min_capacity}-{table.max_capacity}p
                        </span>
                        {isCurrent && <Check className="h-3.5 w-3.5 text-primary ml-1" />}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
          {activeAreas.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Geen actieve tafels gevonden.
            </p>
          )}
        </div>
      )}
    </NestoModal>
  );
}
