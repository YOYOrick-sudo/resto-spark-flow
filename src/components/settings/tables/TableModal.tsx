import { useState, useEffect } from "react";
import { NestoModal } from "@/components/polar/NestoModal";
import { NestoInput } from "@/components/polar/NestoInput";
import { NestoButton } from "@/components/polar/NestoButton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCreateTable, useUpdateTable, getNextTableSortOrder } from "@/hooks/useTableMutations";
import { parseSupabaseError } from "@/lib/supabaseErrors";
import type { Table } from "@/types/reservations";

interface TableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  areaId: string;
  editingTable: Table | null;
}

export function TableModal({ open, onOpenChange, areaId, editingTable }: TableModalProps) {
  const [tableNumber, setTableNumber] = useState(editingTable?.table_number ?? 1);
  const [displayLabel, setDisplayLabel] = useState(editingTable?.display_label ?? '');
  const [minCapacity, setMinCapacity] = useState(editingTable?.min_capacity ?? 2);
  const [maxCapacity, setMaxCapacity] = useState(editingTable?.max_capacity ?? 4);
  const [isOnlineBookable, setIsOnlineBookable] = useState(editingTable?.is_online_bookable ?? true);
  const [isJoinable, setIsJoinable] = useState(editingTable?.is_joinable ?? true);
  const [error, setError] = useState('');
  
  const { mutate: createTable, isPending: isCreating } = useCreateTable();
  const { mutate: updateTable, isPending: isUpdating } = useUpdateTable();
  
  const isEditing = !!editingTable;
  const isPending = isCreating || isUpdating;

  useEffect(() => {
    if (open) {
      setTableNumber(editingTable?.table_number ?? 1);
      setDisplayLabel(editingTable?.display_label ?? '');
      setMinCapacity(editingTable?.min_capacity ?? 2);
      setMaxCapacity(editingTable?.max_capacity ?? 4);
      setIsOnlineBookable(editingTable?.is_online_bookable ?? true);
      setIsJoinable(editingTable?.is_joinable ?? true);
      setError('');
    }
  }, [open, editingTable]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaId) return;
    
    setError('');
    
    if (minCapacity > maxCapacity) {
      setError('Minimum capaciteit kan niet groter zijn dan maximum.');
      return;
    }
    
    try {
      if (isEditing) {
        updateTable(
          {
            id: editingTable.id,
            table_number: tableNumber,
            display_label: displayLabel.trim() || undefined,
            min_capacity: minCapacity,
            max_capacity: maxCapacity,
            is_online_bookable: isOnlineBookable,
            is_joinable: isJoinable,
          },
          {
            onSuccess: () => onOpenChange(false),
            onError: (err) => setError(parseSupabaseError(err).message),
          }
        );
      } else {
        const sortOrder = await getNextTableSortOrder(areaId);
        createTable(
          {
            area_id: areaId,
            table_number: tableNumber,
            display_label: displayLabel.trim() || undefined,
            min_capacity: minCapacity,
            max_capacity: maxCapacity,
            is_online_bookable: isOnlineBookable,
            is_joinable: isJoinable,
            sort_order: sortOrder,
          },
          {
            onSuccess: () => onOpenChange(false),
            onError: (err) => setError(parseSupabaseError(err).message),
          }
        );
      }
    } catch (err) {
      setError(parseSupabaseError(err).message);
    }
  };

  return (
    <NestoModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Tafel bewerken' : 'Nieuwe tafel'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sectie 1: Identificatie */}
        <div className="grid grid-cols-2 gap-4">
          <NestoInput
            label="Tafelnummer"
            type="number"
            min={1}
            value={tableNumber}
            onChange={(e) => setTableNumber(parseInt(e.target.value) || 1)}
            error={error && error.includes('tafelnummer') ? error : undefined}
          />
          <NestoInput
            label="Label (optioneel)"
            value={displayLabel}
            onChange={(e) => setDisplayLabel(e.target.value)}
            placeholder="bijv. Terras 1"
            error={error && error.includes('label') ? error : undefined}
          />
        </div>

        {/* Sectie 2: Capaciteit */}
        <div className="border-t border-border/50 pt-4 mt-4">
          <p className="text-sm font-medium text-foreground mb-3">Capaciteit</p>
          <div className="grid grid-cols-2 gap-4">
            <NestoInput
              label="Min. capaciteit"
              type="number"
              min={1}
              max={50}
              value={minCapacity}
              onChange={(e) => setMinCapacity(parseInt(e.target.value) || 1)}
            />
            <NestoInput
              label="Max. capaciteit"
              type="number"
              min={1}
              max={50}
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>
        
        {error && !error.includes('tafelnummer') && !error.includes('label') && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Sectie 3: Instellingen */}
        <div className="border-t border-border/50 pt-4 mt-4 space-y-4">
          <p className="text-sm font-medium text-foreground">Instellingen</p>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_online_bookable" className="text-sm font-medium">
                Online boekbaar
              </Label>
              <p className="text-xs text-muted-foreground">
                Tafel is beschikbaar voor online reserveringen.
              </p>
            </div>
            <Switch
              id="is_online_bookable"
              checked={isOnlineBookable}
              onCheckedChange={setIsOnlineBookable}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_joinable" className="text-sm font-medium">
                Koppelbaar
              </Label>
              <p className="text-xs text-muted-foreground">
                Tafel kan gecombineerd worden met andere tafels.
              </p>
            </div>
            <Switch
              id="is_joinable"
              checked={isJoinable}
              onCheckedChange={setIsJoinable}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4">
          <NestoButton type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </NestoButton>
          <NestoButton type="submit" disabled={isPending}>
            {isPending ? 'Opslaan...' : isEditing ? 'Opslaan' : 'Aanmaken'}
          </NestoButton>
        </div>
      </form>
    </NestoModal>
  );
}
