import { useState } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoButton } from "@/components/polar/NestoButton";
import { Spinner } from "@/components/polar/LoadingStates";
import { useAreasWithTables } from "@/hooks/useAreasWithTables";
import { useReservations } from "@/hooks/useReservations";
import { useMoveTable } from "@/hooks/useMoveTable";
import { TableSelector } from "./TableSelector";

interface TableMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
  currentTableId: string | null;
  locationId: string;
  partySize?: number;
  reservationDate?: string;
  startTime?: string;
  durationMinutes?: number;
}

export function TableMoveDialog({
  open,
  onOpenChange,
  reservationId,
  currentTableId,
  locationId,
  partySize = 2,
  reservationDate = '',
  startTime = '19:00',
  durationMinutes = 120,
}: TableMoveDialogProps) {
  const { data: areas = [], isLoading } = useAreasWithTables(locationId);
  const { data: reservationsForDate = [] } = useReservations({ date: reservationDate });
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
        <TableSelector
          value={selectedTableId}
          onChange={setSelectedTableId}
          areas={areas}
          partySize={partySize}
          date={reservationDate}
          startTime={startTime}
          effectiveDuration={durationMinutes}
          reservationsForDate={reservationsForDate}
          currentTableId={currentTableId}
          showAutoOption={false}
          showNoneOption={false}
          placeholder="Selecteer nieuwe tafel..."
        />
      )}
    </NestoModal>
  );
}
