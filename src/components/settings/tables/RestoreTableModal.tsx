import { useState } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoButton } from "@/components/polar/NestoButton";
import { AlertTriangle } from "lucide-react";
import { useRestoreTable } from "@/hooks/useTableMutations";
import type { Table } from "@/types/reservations";

interface RestoreTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: Table;
}

export function RestoreTableModal({ open, onOpenChange, table }: RestoreTableModalProps) {
  const [newLabel, setNewLabel] = useState(table.display_label);
  const [error, setError] = useState('');
  const [showLabelInput, setShowLabelInput] = useState(false);
  
  const { mutate: restoreTable, isPending } = useRestoreTable();

  const handleRestore = () => {
    setError('');
    
    restoreTable(
      { tableId: table.id, newLabel: showLabelInput ? newLabel.trim() : undefined },
      {
        onSuccess: () => {
          onOpenChange(false);
          setShowLabelInput(false);
          setNewLabel(table.display_label);
        },
        onError: (err: Error & { code?: string }) => {
          if (err.code === 'label_conflict') {
            // Show input for new label
            setShowLabelInput(true);
            setError(`Het label "${table.display_label}" is al in gebruik. Kies een ander label.`);
          } else {
            setError(err.message);
          }
        }
      }
    );
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setShowLabelInput(false);
      setError('');
      setNewLabel(table.display_label);
    }
    onOpenChange(isOpen);
  };

  return (
    <NestoModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Tafel herstellen"
    >
      <div className="space-y-4">
        {!showLabelInput ? (
          <>
            <p className="text-sm text-muted-foreground">
              Weet je zeker dat je tafel "{table.display_label}" wilt herstellen?
            </p>
            
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 text-warning">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
            
            <NestoInput
              label="Nieuw label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="bijv. Terras 1-B"
              autoFocus
            />
          </>
        )}
        
        <div className="flex justify-end gap-2 pt-4">
          <NestoButton type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton 
            onClick={handleRestore} 
            disabled={isPending || (showLabelInput && !newLabel.trim())}
          >
            {isPending ? 'Herstellen...' : showLabelInput ? 'Herstellen met nieuw label' : 'Herstellen'}
          </NestoButton>
        </div>
      </div>
    </NestoModal>
  );
}
